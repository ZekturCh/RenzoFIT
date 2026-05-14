// assets/js/pages/servicios-finales.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { ORDER_STATUS } from "../constants.js";
import { formatCurrency, formatDate } from "../utils.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let selectedPaymentOrder = null;
let toCollectOrders = [];

if (session) {
  renderSidebar(session.profile);
  setupPaymentModal();
  await loadFinalServices();
}

function setupPaymentModal() {
  document.querySelector("#closePaymentModal").addEventListener("click", closePaymentModal);
  document.querySelector("#savePaymentBtn").addEventListener("click", savePayment);
}

async function loadFinalServices() {
  await Promise.all([
    loadToCollect(),
    loadToPickup()
  ]);
}

async function loadToCollect() {
  const container = document.querySelector("#toCollectList");

  const q = query(
    collection(db, "workOrders"),
    where("status", "==", ORDER_STATUS.POR_COBRAR),
    orderBy("finishedAt", "asc")
  );

  const snapshot = await getDocs(q);

  toCollectOrders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  if (toCollectOrders.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay servicios por cobrar.</p>`;
    return;
  }

  container.innerHTML = toCollectOrders.map((order) => `
    <article class="service-card to-collect-card">
      <div class="service-card-top">
        <div>
          <h3>Servicio <span class="service-code">${order.code || order.id}</span></h3>
          <p class="card-meta">Terminado: ${formatDate(order.finishedAt)}</p>
          <p class="card-meta">Técnico: ${order.assignedToName || order.assignedToEmail || "-"}</p>
          <p>Total: <strong>${formatCurrency(order.total || 0)}</strong></p>
          <p>Pagado: <strong>${formatCurrency(order.paidAmount || 0)}</strong></p>
          <p>Falta: <strong class="text-red">${formatCurrency(order.remainingAmount || 0)}</strong></p>
        </div>

        <span class="status-badge status-red">Por cobrar</span>
      </div>

      <div class="service-card-actions">
        <button class="btn-primary open-payment-btn" data-id="${order.id}">
          Registrar pago
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".open-payment-btn").forEach((btn) => {
    btn.addEventListener("click", () => openPaymentModal(btn.dataset.id));
  });
}

async function loadToPickup() {
  const container = document.querySelector("#toPickupList");

  const q = query(
    collection(db, "workOrders"),
    where("status", "==", ORDER_STATUS.POR_RECOGER),
    orderBy("finishedAt", "asc")
  );

  const snapshot = await getDocs(q);

  const orders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  if (orders.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay servicios por recoger.</p>`;
    return;
  }

  container.innerHTML = orders.map((order) => `
    <article class="service-card to-pickup-card">
      <div class="service-card-top">
        <div>
          <h3>Servicio <span class="service-code">${order.code || order.id}</span></h3>
          <p class="card-meta">Terminado: ${formatDate(order.finishedAt)}</p>
          <p class="card-meta">Técnico: ${order.assignedToName || order.assignedToEmail || "-"}</p>
          <p>Total: <strong>${formatCurrency(order.total || 0)}</strong></p>
        </div>

        <span class="status-badge">Por recoger</span>
      </div>

      <div class="service-card-actions">
        <button class="btn-primary mark-delivered-btn" data-id="${order.id}">
          Marcar entregado
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".mark-delivered-btn").forEach((btn) => {
    btn.addEventListener("click", () => markDelivered(btn.dataset.id));
  });
}

function openPaymentModal(orderId) {
  selectedPaymentOrder = toCollectOrders.find((order) => order.id === orderId);

  if (!selectedPaymentOrder) return;

  document.querySelector("#paymentAmount").value = selectedPaymentOrder.remainingAmount || 0;
  document.querySelector("#paymentModal").classList.remove("hidden");
}

function closePaymentModal() {
  selectedPaymentOrder = null;
  document.querySelector("#paymentModal").classList.add("hidden");
}

async function savePayment() {
  if (!selectedPaymentOrder) return;

  const amount = Number(document.querySelector("#paymentAmount").value || 0);
  const method = document.querySelector("#paymentMethod").value;
  const note = document.querySelector("#paymentNote").value.trim();

  if (amount <= 0) {
    alert("Ingresa un monto válido.");
    return;
  }

  const newPaidAmount = Number(selectedPaymentOrder.paidAmount || 0) + amount;
  const newRemaining = Number(selectedPaymentOrder.total || 0) - newPaidAmount;

  const nextStatus = newRemaining <= 0
    ? ORDER_STATUS.POR_RECOGER
    : ORDER_STATUS.POR_COBRAR;

  await addDoc(collection(db, "payments"), {
    workOrderId: selectedPaymentOrder.id,
    amount,
    method,
    note,
    createdByEmail: session.profile.email,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "workOrders", selectedPaymentOrder.id), {
    paidAmount: newPaidAmount,
    remainingAmount: Math.max(newRemaining, 0),
    status: nextStatus,
    updatedAt: serverTimestamp()
  });

  alert("Pago registrado.");
  closePaymentModal();
  await loadFinalServices();
}

async function markDelivered(orderId) {
  const confirmDelivery = confirm("¿Confirmas que la moto ya fue recogida?");
  if (!confirmDelivery) return;

  await updateDoc(doc(db, "workOrders", orderId), {
    status: ORDER_STATUS.ENTREGADO,
    deliveredAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  alert("Servicio marcado como entregado.");
  await loadFinalServices();
}
