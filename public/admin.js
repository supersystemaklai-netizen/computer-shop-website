let ADMIN_TOKEN = sessionStorage.getItem("adminToken") || null;

const loginScreen = document.getElementById("login-screen");
const dash = document.getElementById("dash");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

function showDashboard() {
  loginScreen.style.display = "none";
  dash.classList.add("open");
  loadEnquiries();
  loadProductsAdmin();
}

function showLogin() {
  loginScreen.style.display = "flex";
  dash.classList.remove("open");
}

if (ADMIN_TOKEN) showDashboard(); else showLogin();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    ADMIN_TOKEN = data.token;
    sessionStorage.setItem("adminToken", ADMIN_TOKEN);
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", { method: "POST", headers: authHeaders() });
  } catch (e) {}
  sessionStorage.removeItem("adminToken");
  ADMIN_TOKEN = null;
  showLogin();
});

function authHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": ADMIN_TOKEN };
}

async function authedFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  if (res.status === 401) {
    sessionStorage.removeItem("adminToken");
    ADMIN_TOKEN = null;
    showLogin();
    throw new Error("Session expired, please log in again.");
  }
  return res;
}

// ---------- Tabs ----------
document.querySelectorAll(".sidebar .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar .tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Enquiries ----------
async function loadEnquiries() {
  const list = document.getElementById("enquiry-list");
  try {
    const res = await authedFetch("/api/enquiries");
    const enquiries = await res.json();
    document.getElementById("enquiry-count").textContent = `${enquiries.length} total`;

    if (!enquiries.length) {
      list.innerHTML = `<p class="empty-note">No service requests yet. New submissions from the storefront will show up here.</p>`;
      return;
    }

    list.innerHTML = enquiries.map((eq) => `
      <div class="enquiry-card" data-id="${eq.id}">
        <div class="enquiry-top">
          <div>
            <h3>${eq.serviceTitle}</h3>
            <div class="enquiry-meta">${eq.category} · ${new Date(eq.createdAt).toLocaleString("en-IN")}</div>
          </div>
          <select class="status-select" data-id="${eq.id}">
            ${["New", "Contacted", "In Progress", "Completed", "Cancelled"].map((s) =>
              `<option value="${s}" ${s === eq.status ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </div>
        <div class="enquiry-details">
          <div><span>Name</span>${eq.name}</div>
          <div><span>Phone</span>${eq.phone}</div>
          ${eq.email ? `<div><span>Email</span>${eq.email}</div>` : ""}
          ${eq.address ? `<div><span>Address</span>${eq.address}</div>` : ""}
          ${Object.entries(eq.customFields || {}).filter(([, v]) => v).map(([k, v]) =>
            `<div><span>${k}</span>${v}</div>`
          ).join("")}
        </div>
        <div class="enquiry-actions">
          <button class="btn-small danger" data-delete="${eq.id}">Delete</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", () => updateEnquiryStatus(sel.dataset.id, sel.value));
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteEnquiry(btn.dataset.delete));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-note">${err.message}</p>`;
  }
}

async function updateEnquiryStatus(id, status) {
  await authedFetch(`/api/enquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });
}

async function deleteEnquiry(id) {
  if (!confirm("Delete this service request?")) return;
  await authedFetch(`/api/enquiries/${id}`, { method: "DELETE" });
  loadEnquiries();
}

// ---------- Products ----------
const productForm = document.getElementById("product-form");
const productSubmitBtn = document.getElementById("product-submit-btn");
const cancelEditBtn = document.getElementById("product-cancel-edit");

async function loadProductsAdmin() {
  const tbody = document.getElementById("product-table-body");
  try {
    const res = await fetch("/api/products");
    const products = await res.json();

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-note">No products yet — add your first one above.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td>
          ${p.name}
          ${p.bestOffer ? `<span class="badge-offer" style="margin-left:8px;">Best offer</span>` : ""}
        </td>
        <td>${p.category}</td>
        <td>
          ₹${(p.offerPrice ?? p.price).toLocaleString("en-IN")}
          ${p.offerPrice ? `<span style="color:var(--text-muted); text-decoration:line-through; font-size:12px; margin-left:6px;">₹${p.price.toLocaleString("en-IN")}</span>` : ""}
        </td>
        <td>${p.stock}</td>
        <td>
          <div class="row-actions">
            <button class="btn-small" data-edit='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Edit</button>
            <button class="btn-small danger" data-delete-product="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = JSON.parse(btn.getAttribute("data-edit"));
        fillProductForm(p);
      });
    });
    tbody.querySelectorAll("[data-delete-product]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.deleteProduct));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Could not load products.</td></tr>`;
  }
}

function fillProductForm(p) {
  document.getElementById("product-id").value = p.id;
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-category").value = p.category;
  document.getElementById("p-price").value = p.price;
  document.getElementById("p-offer").value = p.offerPrice ?? "";
  document.getElementById("p-stock").value = p.stock;
  document.getElementById("p-image").value = p.image || "";
  document.getElementById("p-description").value = p.description || "";
  document.getElementById("p-best-offer").checked = !!p.bestOffer;
  document.getElementById("product-form-title").textContent = "Edit product";
  productSubmitBtn.textContent = "Save changes";
  cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProductForm() {
  productForm.reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-form-title").textContent = "Add a product";
  productSubmitBtn.textContent = "Add product";
  cancelEditBtn.style.display = "none";
}

cancelEditBtn.addEventListener("click", resetProductForm);

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("product-id").value;
  const payload = {
    name: document.getElementById("p-name").value,
    category: document.getElementById("p-category").value,
    price: document.getElementById("p-price").value,
    offerPrice: document.getElementById("p-offer").value,
    stock: document.getElementById("p-stock").value,
    image: document.getElementById("p-image").value,
    description: document.getElementById("p-description").value,
    bestOffer: document.getElementById("p-best-offer").checked
  };

  try {
    if (id) {
      await authedFetch(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await authedFetch(`/api/products`, { method: "POST", body: JSON.stringify(payload) });
    }
    resetProductForm();
    loadProductsAdmin();
  } catch (err) {
    alert(err.message);
  }
});

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  await authedFetch(`/api/products/${id}`, { method: "DELETE" });
  loadProductsAdmin();
}
