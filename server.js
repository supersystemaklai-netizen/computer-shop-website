const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const ENQUIRIES_FILE = path.join(DATA_DIR, "enquiries.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

// ---- Simple hardcoded admin credentials (change these!) ----
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// in-memory session tokens (fine for a small local/single-instance shop site)
const activeTokens = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token && activeTokens.has(token)) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized. Please login again." });
}

function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Admin auth ----------
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString("hex");
    activeTokens.add(token);
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  const token = req.headers["x-admin-token"];
  activeTokens.delete(token);
  res.json({ success: true });
});

// ---------- Enquiries (service requests submitted by customers) ----------

// Customer submits a service enquiry form (public)
app.post("/api/enquiries", (req, res) => {
  const { serviceId, serviceTitle, category, name, phone, email, address, customFields } = req.body || {};

  if (!serviceId || !name || !phone) {
    return res.status(400).json({ error: "Name, phone and service are required." });
  }

  const enquiries = readJSON(ENQUIRIES_FILE);
  const newEnquiry = {
    id: genId("enq"),
    serviceId,
    serviceTitle: serviceTitle || serviceId,
    category: category || "",
    name,
    phone,
    email: email || "",
    address: address || "",
    customFields: customFields || {},
    status: "New",
    createdAt: new Date().toISOString()
  };

  enquiries.unshift(newEnquiry);
  writeJSON(ENQUIRIES_FILE, enquiries);

  res.json({ success: true, enquiry: newEnquiry });
});

// Admin: get all enquiries
app.get("/api/enquiries", requireAdmin, (req, res) => {
  const enquiries = readJSON(ENQUIRIES_FILE);
  res.json(enquiries);
});

// Admin: update enquiry status
app.put("/api/enquiries/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const enquiries = readJSON(ENQUIRIES_FILE);
  const idx = enquiries.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "Enquiry not found" });
  if (status) enquiries[idx].status = status;
  writeJSON(ENQUIRIES_FILE, enquiries);
  res.json({ success: true, enquiry: enquiries[idx] });
});

// Admin: delete enquiry
app.delete("/api/enquiries/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  let enquiries = readJSON(ENQUIRIES_FILE);
  const before = enquiries.length;
  enquiries = enquiries.filter((e) => e.id !== id);
  if (enquiries.length === before) return res.status(404).json({ error: "Enquiry not found" });
  writeJSON(ENQUIRIES_FILE, enquiries);
  res.json({ success: true });
});

// ---------- Products ----------

// Public: list all products (used on the storefront)
app.get("/api/products", (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  res.json(products);
});

// Admin: add product
app.post("/api/products", requireAdmin, (req, res) => {
  const { name, category, price, offerPrice, bestOffer, description, image, stock } = req.body || {};
  if (!name || price === undefined) {
    return res.status(400).json({ error: "Product name and price are required." });
  }
  const products = readJSON(PRODUCTS_FILE);
  const newProduct = {
    id: genId("prod"),
    name,
    category: category || "General",
    price: Number(price) || 0,
    offerPrice: offerPrice !== undefined && offerPrice !== "" ? Number(offerPrice) : null,
    bestOffer: !!bestOffer,
    description: description || "",
    image: image || "",
    stock: stock !== undefined && stock !== "" ? Number(stock) : 0
  };
  products.unshift(newProduct);
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product: newProduct });
});

// Admin: update product
app.put("/api/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const products = readJSON(PRODUCTS_FILE);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });

  const { name, category, price, offerPrice, bestOffer, description, image, stock } = req.body || {};
  const p = products[idx];
  if (name !== undefined) p.name = name;
  if (category !== undefined) p.category = category;
  if (price !== undefined) p.price = Number(price) || 0;
  if (offerPrice !== undefined) p.offerPrice = offerPrice === "" ? null : Number(offerPrice);
  if (bestOffer !== undefined) p.bestOffer = !!bestOffer;
  if (description !== undefined) p.description = description;
  if (image !== undefined) p.image = image;
  if (stock !== undefined) p.stock = Number(stock) || 0;

  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true, product: p });
});

// Admin: delete product
app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  let products = readJSON(PRODUCTS_FILE);
  const before = products.length;
  products = products.filter((p) => p.id !== id);
  if (products.length === before) return res.status(404).json({ error: "Product not found" });
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\nComputer & CCTV Shop website running!`);
  console.log(`Storefront:  http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`Admin login -> username: ${ADMIN_USERNAME}  password: ${ADMIN_PASSWORD}\n`);
});
