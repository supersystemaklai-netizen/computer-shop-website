const servicesContainer = document.getElementById("services-container");
const productsContainer = document.getElementById("products-container");
const overlay = document.getElementById("modal-overlay");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// ---------- Render category chips ----------
function renderChips() {
  const chipStrip = document.getElementById("chip-strip-inner");
  const chips = SERVICE_CATEGORIES.flatMap((group) => group.services.map((svc) => ({ ...svc, groupIcon: group.categoryIcon })));
  chipStrip.innerHTML = chips.map((svc) => `
    <button class="chip" data-service="${svc.id}">${svc.icon || svc.groupIcon} ${svc.title}</button>
  `).join("");

  chipStrip.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => openServiceForm(chip.dataset.service));
  });
}

// ---------- Render services ----------
function renderServices() {
  servicesContainer.innerHTML = SERVICE_CATEGORIES.map((group) => `
    <div class="service-group">
      <div class="service-group-title">${group.categoryIcon || ""} ${group.category}</div>
      <div class="card-grid">
        ${group.services.map((svc) => `
          <button class="service-card" data-service="${svc.id}">
            <div class="service-icon">${svc.icon || "🔧"}</div>
            <h3>${svc.title}</h3>
            <p>${svc.blurb}</p>
            <span class="card-link">Book now</span>
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("click", () => openServiceForm(card.dataset.service));
  });
}

// ---------- Modal: service form ----------
function openServiceForm(serviceId) {
  const svc = SERVICE_LOOKUP[serviceId];
  if (!svc) return;

  const extraFieldsHtml = svc.fields.map((f) => renderField(f)).join("");

  modalBody.innerHTML = `
    <h3>${svc.title}</h3>
    <p class="modal-sub">${svc.blurb} Fill in your details and we'll contact you.</p>
    <form id="enquiry-form">
      <div class="field">
        <label>Your name</label>
        <input type="text" name="name" required>
      </div>
      <div class="field">
        <label>Phone number</label>
        <input type="tel" name="phone" required>
      </div>
      <div class="field">
        <label>Email (optional)</label>
        <input type="email" name="email">
      </div>
      <div class="field">
        <label>Address</label>
        <input type="text" name="address">
      </div>
      ${extraFieldsHtml}
      <button type="submit" class="form-submit">Send request</button>
      <p class="form-note">We usually respond within a few hours.</p>
    </form>
  `;

  const form = document.getElementById("enquiry-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitEnquiry(svc, form);
  });

  overlay.classList.add("open");
}

function renderField(f) {
  const name = `custom__${f.name}`;
  if (f.type === "select") {
    return `
      <div class="field">
        <label>${f.label}</label>
        <select name="${name}">
          <option value="">Select…</option>
          ${f.options.map((o) => `<option value="${o}">${o}</option>`).join("")}
        </select>
      </div>`;
  }
  if (f.type === "textarea") {
    return `
      <div class="field">
        <label>${f.label}</label>
        <textarea name="${name}"></textarea>
      </div>`;
  }
  return `
    <div class="field">
      <label>${f.label}</label>
      <input type="${f.type}" name="${name}">
    </div>`;
}

async function submitEnquiry(svc, form) {
  const formData = new FormData(form);
  const payload = {
    serviceId: svc.id,
    serviceTitle: svc.title,
    category: svc.category,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    customFields: {}
  };

  svc.fields.forEach((f) => {
    payload.customFields[f.label] = formData.get(`custom__${f.name}`) || "";
  });

  const submitBtn = form.querySelector(".form-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    modalBody.innerHTML = `
      <div class="success-box">
        <div class="check">✓</div>
        <h3>Request received</h3>
        <p class="modal-sub">Thanks, ${payload.name}. Our team will call you on ${payload.phone} shortly.</p>
        <button class="btn-secondary" id="modal-done" style="margin-top:10px;">Close</button>
      </div>
    `;
    document.getElementById("modal-done").addEventListener("click", closeModal);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send request";
    alert(err.message);
  }
}

function closeModal() {
  overlay.classList.remove("open");
  modalBody.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

// ---------- Render products ----------
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const products = await res.json();
    if (!products.length) {
      productsContainer.innerHTML = `<p class="empty-note">No products added yet. Check back soon.</p>`;
      return;
    }
    productsContainer.innerHTML = products.map((p) => {
      const discountPct = p.offerPrice ? Math.round(100 - (p.offerPrice / p.price) * 100) : null;
      return `
      <div class="product-card">
        <div class="product-media">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : "📦"}
          ${discountPct ? `<span class="offer-badge">${discountPct}% OFF</span>` : (p.bestOffer ? `<span class="offer-badge">Best offer</span>` : "")}
        </div>
        <div class="product-body">
          <div class="product-category">${p.category}</div>
          <h3>${p.name}</h3>
          <p>${p.description || ""}</p>
          <div class="price-row">
            <span class="price-now">₹${(p.offerPrice ?? p.price).toLocaleString("en-IN")}</span>
            ${p.offerPrice ? `<span class="price-old">₹${p.price.toLocaleString("en-IN")}</span>` : ""}
          </div>
          <button class="add-btn" type="button">ADD</button>
        </div>
      </div>
    `;
    }).join("");
  } catch (err) {
    productsContainer.innerHTML = `<p class="empty-note">Could not load products right now.</p>`;
  }
}

renderChips();
renderServices();
loadProducts();

// ADD button is a visual affordance for the products showcase (enquire via the service form above)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-btn")) {
    e.target.textContent = "ADDED ✓";
    setTimeout(() => { e.target.textContent = "ADD"; }, 1200);
  }
});
