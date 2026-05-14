// assets/js/pages/inventario.js

import { db } from "../firebase-config.js";
import { requireAdminOrBasic } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { ROLES } from "../constants.js";
import { formatCurrency } from "../utils.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdminOrBasic();

let products = [];
let pendingProducts = [];

if (session) {
  renderSidebar(session.profile);
  setupInventoryEvents();
  applyRoleVisibility();
  await loadInventory();
}

function setupInventoryEvents() {
  document.querySelector("#openProductModalBtn").addEventListener("click", openProductModal);
  document.querySelector("#closeProductModal").addEventListener("click", closeProductModal);
  document.querySelector("#saveProductBtn").addEventListener("click", saveProduct);
  document.querySelector("#inventorySearch").addEventListener("input", renderInventory);
}

function applyRoleVisibility() {
  const isAdmin = session.profile.role === ROLES.ADMIN;

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });
}

async function loadInventory() {
  await Promise.all([
    loadApprovedProducts(),
    loadPendingProducts()
  ]);
}

async function loadApprovedProducts() {
  const q = query(
    collection(db, "inventory"),
    where("approved", "==", true),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);

  products = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderInventory();
}

async function loadPendingProducts() {
  const isAdmin = session.profile.role === ROLES.ADMIN;

  if (!isAdmin) return;

  const q = query(
    collection(db, "inventory"),
    where("pendingApproval", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  pendingProducts = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderPendingProducts();
}

function renderInventory() {
  const tbody = document.querySelector("#inventoryTableBody");
  const search = document.querySelector("#inventorySearch").value.toLowerCase().trim();
  const isAdmin = session.profile.role === ROLES.ADMIN;

  const filtered = products.filter((product) => {
    const text = `${product.name || ""} ${product.category || ""}`.toLowerCase();
    return text.includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay productos aprobados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((product) => `
    <tr>
      <td>${product.name || "-"}</td>
      <td>${product.category || "-"}</td>
      <td class="${Number(product.stock || 0) <= 2 ? "low-stock" : ""}">
        ${product.stock || 0}
      </td>
      ${
        isAdmin
          ? `
            <td>${formatCurrency(product.purchasePrice || 0)}</td>
            <td>${formatCurrency(product.salePrice || 0)}</td>
            <td>
              <button class="btn-secondary">Editar</button>
            </td>
          `
          : ""
      }
    </tr>
  `).join("");
}

function renderPendingProducts() {
  const container = document.querySelector("#pendingProductsList");

  if (!container) return;

  if (pendingProducts.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay productos pendientes.</p>`;
    return;
  }

  container.innerHTML = pendingProducts.map((product) => `
    <article class="product-card pending">
      <strong class="product-name">${product.name || "-"}</strong>
      <p>Categoría: ${product.category || "Pendiente"}</p>
      <p>Cantidad: <strong class="product-stock">${product.stock || 0}</strong></p>

      <div class="product-actions">
        <button class="btn-secondary approve-btn" data-id="${product.id}">Aprobar</button>
        <button class="btn-secondary deny-btn" data-id="${product.id}">Denegar</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => approveProduct(btn.dataset.id));
  });

  document.querySelectorAll(".deny-btn").forEach((btn) => {
    btn.addEventListener("click", () => denyProduct(btn.dataset.id));
  });
}

function openProductModal() {
  document.querySelector("#productModal").classList.remove("hidden");
}

function closeProductModal() {
  document.querySelector("#productModal").classList.add("hidden");
}

async function saveProduct() {
  const isAdmin = session.profile.role === ROLES.ADMIN;

  const payload = {
    name: document.querySelector("#productName").value.trim(),
    category: document.querySelector("#productCategory").value.trim() || "Pendiente",
    stock: Number(document.querySelector("#productStock").value || 0),
    unit: "unidad",
    approved: isAdmin,
    pendingApproval: !isAdmin,
    createdBy: session.firebaseUser.uid,
    createdByRole: session.profile.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!payload.name) {
    alert("Escribe el nombre del producto.");
    return;
  }

  if (isAdmin) {
    payload.purchasePrice = Number(document.querySelector("#productPurchasePrice").value || 0);
    payload.salePrice = Number(document.querySelector("#productSalePrice").value || 0);
  }

  await addDoc(collection(db, "inventory"), payload);

  alert(isAdmin ? "Producto agregado al inventario." : "Producto enviado para aprobación.");
  closeProductModal();
  await loadInventory();
}

async function approveProduct(productId) {
  const product = pendingProducts.find((item) => item.id === productId);
  if (!product) return;

  await updateDoc(doc(db, "inventory", productId), {
    approved: true,
    pendingApproval: false,
    purchasePrice: product.purchasePrice || 0,
    salePrice: product.salePrice || 0,
    updatedAt: serverTimestamp()
  });

  alert("Producto aprobado.");
  await loadInventory();
}

async function denyProduct(productId) {
  const confirmDeny = confirm("¿Seguro que quieres denegar este producto?");
  if (!confirmDeny) return;

  await deleteDoc(doc(db, "inventory", productId));

  alert("Producto denegado.");
  await loadInventory();
}
