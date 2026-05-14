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

let bikesToSave = [];
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
  document.querySelector("#addBikeToClientBtn").addEventListener("click", addBikeToPreview);
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

function addBikeToPreview() {
  const bike = {
    brand: document.querySelector("#dirBikeBrand").value.trim(),
    model: document.querySelector("#dirBikeModel").value.trim(),
    mileage: Number(document.querySelector("#dirBikeMileage").value || 0),
    plate: document.querySelector("#dirBikePlate").value.trim(),
    color: document.querySelector("#dirBikeColor").value.trim(),
    vin: document.querySelector("#dirBikeVin").value.trim(),
    year: Number(document.querySelector("#dirBikeYear").value || 0),
    transmission: document.querySelector("#dirBikeTransmission").value
  };

  if (!bike.brand && !bike.model && !bike.plate) {
    alert("Agrega al menos marca, modelo o placa.");
    return;
  }

  bikesToSave.push({
    id: crypto.randomUUID(),
    ...bike
  });

  clearBikeForm();
  renderBikesPreview();
}

function renderBikesPreview() {
  const container = document.querySelector("#clientBikesPreview");

  if (bikesToSave.length === 0) {
    container.innerHTML = `<p class="empty-message">Todavía no agregaste motos.</p>`;
    return;
  }

  container.innerHTML = bikesToSave.map((bike) => `
    <div class="bike-row">
      <strong>${bike.brand || "-"} ${bike.model || ""}</strong>
      <span>Placa: ${bike.plate || "-"}</span>
      <button type="button" class="remove-preview-bike btn-secondary" data-id="${bike.id}">
        Quitar
      </button>
    </div>
  `).join("");

  document.querySelectorAll(".remove-preview-bike").forEach((btn) => {
    btn.addEventListener("click", () => {
      bikesToSave = bikesToSave.filter((bike) => bike.id !== btn.dataset.id);
      renderBikesPreview();
    });
  });
}

function clearBikeForm() {
  document.querySelector("#dirBikeBrand").value = "";
  document.querySelector("#dirBikeModel").value = "";
  document.querySelector("#dirBikeMileage").value = "";
  document.querySelector("#dirBikePlate").value = "";
  document.querySelector("#dirBikeColor").value = "";
  document.querySelector("#dirBikeVin").value = "";
  document.querySelector("#dirBikeYear").value = "";
  document.querySelector("#dirBikeTransmission").value = "";
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
    createdByEmail: session.profile.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!clientPayload.firstName || !clientPayload.phone) {
    alert("Completa al menos nombre y teléfono.");
    return;
  }

  // 1. Guarda el cliente
  const clientRef = await addDoc(collection(db, "clients"), clientPayload);

  // 2. Guarda todas las motos agregadas a la lista temporal
  for (const bike of bikesToSave) {
    await addDoc(collection(db, "bikes"), {
      clientId: clientRef.id,
      brand: bike.brand,
      model: bike.model,
      mileage: bike.mileage,
      plate: bike.plate,
      color: bike.color,
      vin: bike.vin,
      year: bike.year,
      transmission: bike.transmission,
      createdByEmail: session.profile.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  alert("Cliente guardado.");

  // 3. Limpia todo
  bikesToSave = [];
  renderBikesPreview();

  closeClientModal();
  await loadClients();
}
