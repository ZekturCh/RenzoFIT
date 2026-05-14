// assets/js/pages/servicios-activos.js

import { db } from "../firebase-config.js";
import { requireAdminOrBasic } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { ROLES, ORDER_STATUS } from "../constants.js";
import { formatCurrency, formatDate, calculateItemsTotal } from "../utils.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdminOrBasic();

let currentStatusFilter = ORDER_STATUS.DIAGNOSTICANDO;
let currentOrders = [];
let selectedOrder = null;

if (session) {
  renderSidebar(session.profile);
  setupTabs();
  setupModal();
  await loadActiveServices();
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentStatusFilter = btn.dataset.status;
      await loadActiveServices();
    });
  });
}

function setupModal() {
  document.querySelector("#closeServiceModal").addEventListener("click", closeModal);
  document.querySelector("#modalAddItemBtn").addEventListener("click", addItemToSelectedOrder);
  document.querySelector("#markReadyToWorkBtn").addEventListener("click", markReadyToWork);
  document.querySelector("#finishWorkBtn").addEventListener("click", finishWork);
}

async function loadActiveServices() {
  const container = document.querySelector("#activeServicesList");
  const isAdmin = session.profile.role === ROLES.ADMIN;

  let q;

  if (isAdmin) {
    q = query(
      collection(db, "workOrders"),
      where("status", "==", currentStatusFilter),
      orderBy("createdAt", "asc")
    );
  } else {
    q = query(
      collection(db, "workOrders"),
      where("status", "==", currentStatusFilter),
      where("assignedTo", "==", session.firebaseUser.uid),
      orderBy("createdAt", "asc")
    );
  }

  const snapshot = await getDocs(q);

  currentOrders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  if (currentOrders.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay servicios en esta sección.</p>`;
    return;
  }

  container.innerHTML = currentOrders.map((order) => `
    <article class="service-card">
      <div class="service-card-top">
        <div>
          <h3>Servicio <span class="service-code">${order.code || order.id}</span></h3>
          <p class="card-meta">Estado: ${getStatusLabel(order.status)}</p>
          <p class="card-meta">Ingreso: ${formatDate(order.createdAt)}</p>
        </div>

        <span class="status-badge status-red">${getStatusLabel(order.status)}</span>
      </div>

      <p>Total: <strong class="text-red admin-price">${formatCurrency(order.total || 0)}</strong></p>

      <div class="service-card-actions">
        <button class="btn-secondary open-service-btn" data-id="${order.id}">
          Abrir servicio
        </button>
      </div>
    </article>
  `).join("");

  if (!isAdmin) {
    document.querySelectorAll(".admin-price").forEach((el) => {
      el.textContent = "Oculto";
    });
  }

  document.querySelectorAll(".open-service-btn").forEach((btn) => {
    btn.addEventListener("click", () => openServiceModal(btn.dataset.id));
  });
}

function openServiceModal(orderId) {
  selectedOrder = currentOrders.find((order) => order.id === orderId);

  if (!selectedOrder) return;

  const isAdmin = session.profile.role === ROLES.ADMIN;

  document.querySelector("#modalServiceTitle").textContent = `Servicio ${selectedOrder.code || selectedOrder.id}`;
  document.querySelector("#modalServiceSubtitle").textContent = `Estado: ${getStatusLabel(selectedOrder.status)}`;
  document.querySelector("#modalObservations").textContent = selectedOrder.entryObservations || "-";

  document.querySelector("#modalTotal").textContent = formatCurrency(selectedOrder.total || 0);
  document.querySelector("#modalAdvance").textContent = formatCurrency(selectedOrder.advancePayment || 0);
  document.querySelector("#modalRemaining").textContent = formatCurrency(selectedOrder.remainingAmount || 0);

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin);
  });

  document.querySelector("#modalItemPrice").classList.toggle("hidden", !isAdmin);

  renderModalItems();

  document.querySelector("#serviceModal").classList.remove("hidden");
}

function closeModal() {
  document.querySelector("#serviceModal").classList.add("hidden");
  selectedOrder = null;
}

function renderModalItems() {
  const container = document.querySelector("#modalItemsList");
  const isReady = selectedOrder.status === ORDER_STATUS.LISTO_TRABAJAR;

  const items = selectedOrder.items || [];

  if (items.length === 0) {
    container.innerHTML = `<p class="empty-message">Sin items.</p>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <label class="checklist-item">
      <input 
        type="checkbox" 
        data-id="${item.id}" 
        ${item.checklistStatus === "done" ? "checked" : ""}
        ${isReady ? "" : "disabled"}
      />
      <span>
        ${item.name} 
        <strong class="item-price-admin admin-only">${formatCurrency(item.total || 0)}</strong>
      </span>
    </label>
  `).join("");

  document.querySelectorAll(".checklist-item input").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      await updateChecklistItem(checkbox.dataset.id, checkbox.checked);
    });
  });

  const allDone = items.length > 0 && items.every((item) => item.checklistStatus === "done");
  const finishBtn = document.querySelector("#finishWorkBtn");

  finishBtn.disabled = !(selectedOrder.status === ORDER_STATUS.LISTO_TRABAJAR && allDone);
}

async function addItemToSelectedOrder() {
  if (!selectedOrder) return;

  const isAdmin = session.profile.role === ROLES.ADMIN;

  const name = document.querySelector("#modalItemName").value.trim();
  const type = document.querySelector("#modalItemType").value;
  const quantity = Number(document.querySelector("#modalItemQuantity").value || 1);
  const unitPrice = isAdmin ? Number(document.querySelector("#modalItemPrice").value || 0) : 0;

  if (!name) {
    alert("Escribe el item detectado.");
    return;
  }

  const newItem = {
    id: crypto.randomUUID(),
    name,
    type,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    checklistStatus: "pending",
    approvedForWork: selectedOrder.status === ORDER_STATUS.LISTO_TRABAJAR,
    addedBy: session.firebaseUser.uid
  };

  selectedOrder.items = [...(selectedOrder.items || []), newItem];

  const total = calculateItemsTotal(selectedOrder.items);
  const remainingAmount = total - Number(selectedOrder.paidAmount || 0);

  await updateDoc(doc(db, "workOrders", selectedOrder.id), {
    items: selectedOrder.items,
    total,
    subtotal: total,
    remainingAmount,
    updatedAt: serverTimestamp()
  });

  selectedOrder.total = total;
  selectedOrder.subtotal = total;
  selectedOrder.remainingAmount = remainingAmount;

  document.querySelector("#modalItemName").value = "";
  document.querySelector("#modalItemQuantity").value = 1;
  document.querySelector("#modalItemPrice").value = "";

  renderModalItems();
}

async function updateChecklistItem(itemId, checked) {
  selectedOrder.items = selectedOrder.items.map((item) => {
    if (item.id !== itemId) return item;

    return {
      ...item,
      checklistStatus: checked ? "done" : "pending"
    };
  });

  await updateDoc(doc(db, "workOrders", selectedOrder.id), {
    items: selectedOrder.items,
    updatedAt: serverTimestamp()
  });

  renderModalItems();
}

async function markReadyToWork() {
  if (!selectedOrder) return;

  await updateDoc(doc(db, "workOrders", selectedOrder.id), {
    status: ORDER_STATUS.LISTO_TRABAJAR,
    readyToWorkAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  alert("Servicio listo para trabajar.");
  closeModal();
  await loadActiveServices();
}

async function finishWork() {
  if (!selectedOrder) return;

  const confirmFinish = confirm("¿Confirmas terminar el trabajo? Ya no debería editarse.");
  if (!confirmFinish) return;

  const nextStatus = selectedOrder.remainingAmount > 0
    ? ORDER_STATUS.POR_COBRAR
    : ORDER_STATUS.POR_RECOGER;

  await updateDoc(doc(db, "workOrders", selectedOrder.id), {
    status: nextStatus,
    finishedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  alert("Trabajo terminado correctamente.");
  closeModal();
  await loadActiveServices();
}

function getStatusLabel(status) {
  const labels = {
    diagnosticando: "Diagnosticando",
    listo_trabajar: "Listo para trabajar"
  };

  return labels[status] || status || "-";
}
