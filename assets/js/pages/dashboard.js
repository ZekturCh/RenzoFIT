// assets/js/pages/dashboard.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { ORDER_STATUS } from "../constants.js";
import { formatDate, formatCurrency } from "../utils.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

if (session) {
  renderSidebar(session.profile);
  await loadDashboard();
}

async function loadDashboard() {
  await Promise.all([
    loadTotalClients(),
    loadLowStock(),
    loadOldestService(),
    loadPendingServices()
  ]);

  document.querySelector("#topProduct").textContent = "Pendiente";
}

async function loadTotalClients() {
  const snapshot = await getDocs(collection(db, "clients"));
  document.querySelector("#totalClients").textContent = snapshot.size;
}

async function loadLowStock() {
  const q = query(
    collection(db, "inventory"),
    where("approved", "==", true),
    orderBy("stock", "asc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    document.querySelector("#lowStock").textContent = "-";
    return;
  }

  const product = snapshot.docs[0].data();
  document.querySelector("#lowStock").textContent = `${product.name} (${product.stock})`;
}

async function loadOldestService() {
  const q = query(
    collection(db, "workOrders"),
    where("status", "in", [
      ORDER_STATUS.COTIZANDO,
      ORDER_STATUS.DIAGNOSTICANDO,
      ORDER_STATUS.LISTO_TRABAJAR
    ]),
    orderBy("createdAt", "asc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    document.querySelector("#oldestService").textContent = "-";
    return;
  }

  const order = snapshot.docs[0].data();
  document.querySelector("#oldestService").textContent = `${order.code || snapshot.docs[0].id}`;
}

async function loadPendingServices() {
  const container = document.querySelector("#pendingServicesList");

  const q = query(
    collection(db, "workOrders"),
    where("status", "in", [
      ORDER_STATUS.COTIZANDO,
      ORDER_STATUS.DIAGNOSTICANDO,
      ORDER_STATUS.LISTO_TRABAJAR,
      ORDER_STATUS.POR_COBRAR,
      ORDER_STATUS.POR_RECOGER
    ]),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    container.innerHTML = `<p class="empty-message">No hay servicios pendientes.</p>`;
    return;
  }

  container.innerHTML = snapshot.docs.map((docSnap) => {
    const order = docSnap.data();

    return `
      <article class="service-card">
        <div class="service-card-top">
          <div>
            <h3>Servicio <span class="service-code">${order.code || docSnap.id}</span></h3>
            <p class="card-meta">Estado: ${getStatusLabel(order.status)}</p>
            <p class="card-meta">Fecha: ${formatDate(order.createdAt)}</p>
          </div>

          <span class="status-badge status-red">${getStatusLabel(order.status)}</span>
        </div>

        <p>Total: <strong class="text-red">${formatCurrency(order.total || 0)}</strong></p>
      </article>
    `;
  }).join("");
}

function getStatusLabel(status) {
  const labels = {
    cotizando: "Cotizando",
    diagnosticando: "Diagnosticando",
    listo_trabajar: "Listo para trabajar",
    trabajo_terminado: "Trabajo terminado",
    por_cobrar: "Por cobrar",
    por_recoger: "Por recoger",
    entregado: "Entregado",
    no_va: "No va"
  };

  return labels[status] || status || "-";
}
