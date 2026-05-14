// assets/js/pages/total-servicios.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { formatCurrency, formatDate } from "../utils.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let historyOrders = [];

if (session) {
  renderSidebar(session.profile);
  setupHistoryEvents();
  await loadHistory();
}

function setupHistoryEvents() {
  document.querySelector("#historySearch").addEventListener("input", renderHistory);
  document.querySelector("#historyMonth").addEventListener("change", renderHistory);
  document.querySelector("#historyYear").addEventListener("input", renderHistory);
}

async function loadHistory() {
  const q = query(
    collection(db, "workOrders"),
    where("status", "in", ["entregado", "no_va"]),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  historyOrders = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderHistory();
}

function renderHistory() {
  const tbody = document.querySelector("#historyTableBody");
  const search = document.querySelector("#historySearch").value.toLowerCase().trim();
  const selectedMonth = document.querySelector("#historyMonth").value;
  const selectedYear = document.querySelector("#historyYear").value.trim();

  const filtered = historyOrders.filter((order) => {
    const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : null;

    const text = `
      ${order.code || ""}
      ${order.status || ""}
      ${order.id || ""}
      ${order.assignedToEmail || ""}
      ${order.assignedToName || ""}
    `.toLowerCase();

    const matchSearch = text.includes(search);

    const matchMonth = selectedMonth === "" ||
      (createdDate && createdDate.getMonth() === Number(selectedMonth));

    const matchYear = selectedYear === "" ||
      (createdDate && createdDate.getFullYear() === Number(selectedYear));

    return matchSearch && matchMonth && matchYear;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">No hay servicios en el historial.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((order) => `
    <tr>
      <td>${order.code || order.id}</td>
      <td>${order.clientId || "-"}</td>
      <td>${order.bikeId || "-"}</td>
      <td>${getStatusLabel(order.status)}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${formatDate(order.finishedAt)}</td>
      <td>${formatDate(order.deliveredAt)}</td>
      <td>${order.assignedToName || order.assignedToEmail || "-"}</td>
      <td>${formatCurrency(order.total || 0)}</td>
    </tr>
  `).join("");
}

function getStatusLabel(status) {
  const labels = {
    entregado: "Entregado",
    no_va: "No va"
  };

  return labels[status] || status || "-";
}
