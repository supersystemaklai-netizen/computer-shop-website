require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase PostgreSQL Connection Pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize Database Tables automatically if they don't exist
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price NUMERIC,
        offer_price NUMERIC,
        best_offer BOOLEAN,
        description TEXT,
        image TEXT,
        stock NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        service_id TEXT,
        service_title TEXT,
        category TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        custom_fields JSONB,
        status TEXT DEFAULT 'New',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("Database tables checked/created successfully.");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}
initDB();

// ---- Hardcoded admin credentials ----
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const activeTokens = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

// ---------- Enquiries ----------
app.post("/api/enquiries", async (req, res) => {
  try {
    const { serviceId, serviceTitle, category, name, phone, email, address, customFields } = req.body || {};
    if (!serviceId || !name || !phone) {
      return res.status(400).json({ error: "Name, phone and service are required." });
    }

    const id = genId("enq");
    const query = `
      INSERT INTO enquiries (id, service_id, service_title, category, name, phone, email, address, custom_fields, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'New')
      RETURNING *;
    `;
    const values = [id, serviceId, serviceTitle || serviceId, category || "", name, phone, email || "", address || "", JSON.stringify(customFields || {})];
    
    const result = await pool.query(query, values);
    res.json({ success: true, enquiry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/enquiries", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM enquiries ORDER BY created_at DESC;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/enquiries/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const result = await pool.query(
      "UPDATE enquiries SET status = $1 WHERE id = $2 RETURNING *;",
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Enquiry not found" });
    res.json({ success: true, enquiry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/enquiries/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM enquiries WHERE id = $1 RETURNING *;", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Enquiry not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Products ----------
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC;");
    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      price: Number(row.price),
      offerPrice: row.offer_price !== null ? Number(row.offer_price) : null,
      bestOffer: row.best_offer,
      description: row.description,
      image: row.image,
      stock: Number(row.stock)
    }));
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  try {
    const { name, category, price, offerPrice, bestOffer, description, image, stock } = req.body || {};
    if (!name || price === undefined) {
      return res.status(400).json({ error: "Product name and price are required." });
    }

    const id = genId("prod");
    const query = `
      INSERT INTO products (id, name, category, price, offer_price, best_offer, description, image, stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      id,
      name,
      category || "General",
      Number(price) || 0,
      offerPrice !== undefined && offerPrice !== "" ? Number(offerPrice) : null,
      !!bestOffer,
      description || "",
      image || "",
      stock !== undefined && stock !== "" ? Number(stock) : 0
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];
    res.json({
      success: true,
      product: {
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price),
        offerPrice: row.offer_price !== null ? Number(row.offer_price) : null,
        bestOffer: row.best_offer,
        description: row.description,
        image: row.image,
        stock: Number(row.stock)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, offerPrice, bestOffer, description, image, stock } = req.body || {};
    
    const existing = await pool.query("SELECT * FROM products WHERE id = $1;", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const p = existing.rows[0];

    const updatedName = name !== undefined ? name : p.name;
    const updatedCategory = category !== undefined ? category : p.category;
    const updatedPrice = price !== undefined ? Number(price) || 0 : p.price;
    const updatedOfferPrice = offerPrice !== undefined ? (offerPrice === "" ? null : Number(offerPrice)) : p.offer_price;
    const updatedBestOffer = bestOffer !== undefined ? !!bestOffer : p.best_offer;
    const updatedDesc = description !== undefined ? description : p.description;
    const updatedImage = image !== undefined ? image : p.image;
    const updatedStock = stock !== undefined ? Number(stock) || 0 : p.stock;

    const query = `
      UPDATE products 
      SET name = $1, category = $2, price = $3, offer_price = $4, best_offer = $5, description = $6, image = $7, stock = $8
      WHERE id = $9
      RETURNING *;
    `;
    const values = [updatedName, updatedCategory, updatedPrice, updatedOfferPrice, updatedBestOffer, updatedDesc, updatedImage, updatedStock, id];
    const result = await pool.query(query, values);
    const row = result.rows[0];

    res.json({
      success: true,
      product: {
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price),
        offerPrice: row.offer_price !== null ? Number(row.offer_price) : null,
        bestOffer: row.best_offer,
        description: row.description,
        image: row.image,
        stock: Number(row.stock)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING *;", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`\nComputer & CCTV Shop website running with Supabase!`);
  console.log(`Storefront:  http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html\n`);
});