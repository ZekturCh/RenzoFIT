// assets/js/pages/cotizar.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { ORDER_STATUS } from "../constants.js";
import { calculateItemsTotal, formatCurrency } from "../utils.js";
import { generateQuotePDF } from "../pdf-generator.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let items = [];
let currentSavedWorkOrder = null;
let currentClientData = null;
let currentBikeData = null;

if (session) {
  renderSidebar(session.profile);
  await loadBasicUsers();
  setupEvents();
}

function setupEvents() {
  document.querySelector("#addItemBtn").addEventListener("click", addItemToQuote);
  document.querySelector("#quoteForm").addEventListener("submit", saveQuote);
  document.querySelector("#downloadPdfBtn").addEventListener("click", downloadCurrentPdf);
}

async function loadBasicUsers() {
  const assignedToSelect = document.querySelector("#assignedTo");

  const q = query(
    collection(db, "users"),
    where("role", "==", "basic"),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);

  assignedToSelect.innerHTML = `<option value="">Seleccionar técnico</option>`;

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();

    assignedToSelect.innerHTML += `
      <option value="${docSnap.id}">${user.name || user.email}</option>
    `;
  });
}

function addItemToQuote() {
  const nameInput = document.querySelector("#itemName");
  const typeInput = document.querySelector("#itemType");
  const quantityInput = document.querySelector("#itemQuantity");
  const priceInput = document.querySelector("#itemPrice");

  const name = nameInput.value.trim();
  const type = typeInput.value;
  const quantity = Number(quantityInput.value || 1);
  const unitPrice = Number(priceInput.value || 0);

  if (!name) {
    alert("Escribe la descripción del item.");
    return;
  }

  items.push({
    id: crypto.randomUUID(),
    name,
    type,
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    checklistStatus: "pending",
    approvedForWork: true,
    addedBy: session.firebaseUser.uid
  });

  nameInput.value = "";
  quantityInput.value = 1;
  priceInput.value = "";

  renderItemsTable();
}

function renderItemsTable() {
  const tbody = document.querySelector("#itemsTableBody");

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Sin items agregados</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = items.map((item) => `
      <tr>
        <td>${item.quantity}</td>
        <td>${item.name}</td>
        <td>${item.type === "product" ? "Producto" : "Servicio"}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.total)}</td>
        <td>
          <button type="button" class="remove-item-btn" data-id="${item.id}">Quitar</button>
        </td>
      </tr>
    `).join("");
  }

  document.querySelectorAll(".remove-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      items = items.filter((item) => item.id !== btn.dataset.id);
      renderItemsTable();
    });
  });

  document.querySelector("#quoteTotal").textContent = formatCurrency(calculateItemsTotal(items));
}

async function saveQuote(event) {
  event.preventDefault();

  if (items.length === 0) {
    alert("Agrega al menos un producto o servicio.");
    return;
  }

  const clientData = getClientFormData();
  const bikeData = getBikeFormData();

  if (!clientData.firstName || !clientData.phone) {
    alert("Completa al menos nombre y teléfono del cliente.");
    return;
  }

  const assignedTo = document.querySelector("#assignedTo").value;
  const status = document.querySelector("#quoteStatus").value;
  const advancePayment = Number(document.querySelector("#advancePayment").value || 0);
  const total = calculateItemsTotal(items);

  const quoteDate = new Date();
  const quoteExpiresAt = new Date();
  quoteExpiresAt.setDate(quoteDate.getDate() + 3);

  const clientRef = await addDoc(collection(db, "clients"), {
    ...clientData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const bikeRef = await addDoc(collection(db, "bikes"), {
    ...bikeData,
    clientId: clientRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const orderPayload = {
    code: String(Date.now()).slice(-6),
    quoteNumber: Number(String(Date.now()).slice(-6)),

    clientId: clientRef.id,
    bikeId: bikeRef.id,
    assignedTo: assignedTo || null,

    status,

    entryObservations: document.querySelector("#entryObservations").value.trim(),

    items,

    subtotal: total,
    discount: 0,
    total,

    advancePayment,
    paidAmount: advancePayment,
    remainingAmount: total - advancePayment,

    quoteDate: Timestamp.fromDate(quoteDate),
    quoteExpiresAt: Timestamp.fromDate(quoteExpiresAt),

    diagnosticStartedAt: status === ORDER_STATUS.DIAGNOSTICANDO ? serverTimestamp() : null,
    readyToWorkAt: null,
    finishedAt: null,
    deliveredAt: null,

    createdBy: session.firebaseUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const orderRef = await addDoc(collection(db, "workOrders"), orderPayload);

  currentSavedWorkOrder = {
    id: orderRef.id,
    ...orderPayload,
    quoteDate
  };

  currentClientData = clientData;
  currentBikeData = bikeData;

  alert("Cotización guardada correctamente.");

  const shouldDownload = confirm("¿Quieres descargar el PDF ahora?");
  if (shouldDownload) {
    await downloadCurrentPdf();
  }

  resetQuoteForm();
}

async function downloadCurrentPdf() {
  if (!currentSavedWorkOrder) {
    const previewClient = getClientFormData();
    const previewBike = getBikeFormData();

    const total = calculateItemsTotal(items);

    await generateQuotePDF({
      workOrder: {
        code: "PREVIEW",
        quoteNumber: "PREVIEW",
        quoteDate: new Date(),
        items,
        total
      },
      client: previewClient,
      bike: previewBike
    });

    return;
  }

  await generateQuotePDF({
    workOrder: currentSavedWorkOrder,
    client: currentClientData,
    bike: currentBikeData
  });
}

function getClientFormData() {
  return {
    firstName: document.querySelector("#clientFirstName").value.trim(),
    lastName: document.querySelector("#clientLastName").value.trim(),
    documentType: document.querySelector("#documentType").value,
    documentNumber: document.querySelector("#documentNumber").value.trim(),
    phone: document.querySelector("#phone").value.trim()
  };
}

function getBikeFormData() {
  return {
    brand: document.querySelector("#bikeBrand").value.trim(),
    model: document.querySelector("#bikeModel").value.trim(),
    mileage: Number(document.querySelector("#bikeMileage").value || 0),
    plate: document.querySelector("#bikePlate").value.trim(),
    color: document.querySelector("#bikeColor").value.trim(),
    vin: document.querySelector("#bikeVin").value.trim(),
    year: Number(document.querySelector("#bikeYear").value || 0),
    transmission: document.querySelector("#bikeTransmission").value.trim()
  };
}

function resetQuoteForm() {
  document.querySelector("#quoteForm").reset();
  items = [];
  currentSavedWorkOrder = null;
  currentClientData = null;
  currentBikeData = null;
  renderItemsTable();
}
