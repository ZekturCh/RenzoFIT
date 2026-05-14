// assets/js/pages/directorio.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";

import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let clients = [];

if (session) {
  renderSidebar(session.profile);
  setupDirectoryEvents();
  await loadClients();
}

function setupDirectoryEvents() {
  document.querySelector("#openClientModalBtn").addEventListener("click", openClientModal);
  document.querySelector("#closeClientModal").addEventListener("click", closeClientModal);
  document.querySelector("#saveClientBtn").addEventListener("click", saveClient);
  document.querySelector("#directorySearch").addEventListener("input", renderClients);
}

async function loadClients() {
  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  clients = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  renderClients();
}

function renderClients() {
  const container = document.querySelector("#clientsList");
  const search = document.querySelector("#directorySearch").value.toLowerCase().trim();

  const filtered = clients.filter((client) => {
    const text = `
      ${client.firstName || ""}
      ${client.lastName || ""}
      ${client.documentNumber || ""}
      ${client.phone || ""}
    `.toLowerCase();

    return text.includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay clientes registrados.</p>`;
    return;
  }

  container.innerHTML = filtered.map((client) => `
    <article class="client-card">
      <div class="client-card-header">
        <div>
          <strong class="client-name">${client.firstName || ""} ${client.lastName || ""}</strong>
          <p class="card-meta">${client.documentType || ""}: ${client.documentNumber || "-"}</p>
          <p class="client-phone">${client.phone || "-"}</p>
        </div>

        <span class="status-badge">Cliente</span>
      </div>

      <div class="bikes-list">
        <p class="card-meta">Historial de motos y servicios se conectará en el siguiente bloque.</p>
      </div>
    </article>
  `).join("");
}

function openClientModal() {
  document.querySelector("#clientModal").classList.remove("hidden");
}

function closeClientModal() {
  document.querySelector("#clientModal").classList.add("hidden");
}

async function saveClient() {
  const clientPayload = {
    firstName: document.querySelector("#dirClientFirstName").value.trim(),
    lastName: document.querySelector("#dirClientLastName").value.trim(),
    documentType: document.querySelector("#dirDocumentType").value,
    documentNumber: document.querySelector("#dirDocumentNumber").value.trim(),
    phone: document.querySelector("#dirPhone").value.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!clientPayload.firstName || !clientPayload.phone) {
    alert("Completa al menos nombre y teléfono.");
    return;
  }

  const clientRef = await addDoc(collection(db, "clients"), clientPayload);

  const bikePayload = {
    clientId: clientRef.id,
    brand: document.querySelector("#dirBikeBrand").value.trim(),
    model: document.querySelector("#dirBikeModel").value.trim(),
    mileage: Number(document.querySelector("#dirBikeMileage").value || 0),
    plate: document.querySelector("#dirBikePlate").value.trim(),
    color: document.querySelector("#dirBikeColor").value.trim(),
    vin: document.querySelector("#dirBikeVin").value.trim(),
    year: Number(document.querySelector("#dirBikeYear").value || 0),
    transmission: document.querySelector("#dirBikeTransmission").value.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (bikePayload.brand || bikePayload.plate || bikePayload.model) {
    await addDoc(collection(db, "bikes"), bikePayload);
  }

  alert("Cliente guardado.");
  closeClientModal();
  await loadClients();
}
