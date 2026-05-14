// assets/js/services/workorders.service.js

import { db } from "../firebase-config.js";
import { ORDER_STATUS } from "../constants.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createWorkOrder(data) {
  const quoteDate = new Date();
  const quoteExpiresAt = new Date();
  quoteExpiresAt.setDate(quoteDate.getDate() + 3);

  const total = Number(data.total || 0);
  const paidAmount = Number(data.paidAmount || data.advancePayment || 0);

  const payload = {
    code: data.code || String(Date.now()).slice(-6),
    quoteNumber: data.quoteNumber || Number(String(Date.now()).slice(-6)),

    clientId: data.clientId,
    bikeId: data.bikeId,

    assignedToEmail: data.assignedToEmail || null,
    assignedToName: data.assignedToName || "",

    status: data.status || ORDER_STATUS.COTIZANDO,

    entryObservations: data.entryObservations || "",

    items: data.items || [],

    subtotal: total,
    discount: Number(data.discount || 0),
    total,

    advancePayment: Number(data.advancePayment || 0),
    paidAmount,
    remainingAmount: Math.max(total - paidAmount, 0),

    quoteDate: Timestamp.fromDate(quoteDate),
    quoteExpiresAt: Timestamp.fromDate(quoteExpiresAt),

    diagnosticStartedAt: data.status === ORDER_STATUS.DIAGNOSTICANDO ? serverTimestamp() : null,
    readyToWorkAt: null,
    finishedAt: null,
    deliveredAt: null,

    createdByEmail: data.createdByEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "workOrders"), payload);

  return {
    id: ref.id,
    ...payload,
    quoteDate
  };
}

export async function getWorkOrderById(orderId) {
  const snap = await getDoc(doc(db, "workOrders", orderId));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}

export async function getWorkOrdersByStatus(status) {
  const q = query(
    collection(db, "workOrders"),
    where("status", "==", status),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getAssignedWorkOrdersByStatus(status, email) {
  const cleanEmail = email.trim().toLowerCase();

  const q = query(
    collection(db, "workOrders"),
    where("status", "==", status),
    where("assignedToEmail", "==", cleanEmail),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function updateWorkOrder(orderId, data) {
  await updateDoc(doc(db, "workOrders", orderId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function updateWorkOrderStatus(orderId, status, extraData = {}) {
  const payload = {
    status,
    ...extraData,
    updatedAt: serverTimestamp()
  };

  if (status === ORDER_STATUS.LISTO_TRABAJAR) {
    payload.readyToWorkAt = serverTimestamp();
  }

  if (status === ORDER_STATUS.POR_COBRAR || status === ORDER_STATUS.POR_RECOGER) {
    payload.finishedAt = serverTimestamp();
  }

  if (status === ORDER_STATUS.ENTREGADO) {
    payload.deliveredAt = serverTimestamp();
  }

  await updateDoc(doc(db, "workOrders", orderId), payload);
}

export async function getHistoryWorkOrders() {
  const q = query(
    collection(db, "workOrders"),
    where("status", "in", [ORDER_STATUS.ENTREGADO, ORDER_STATUS.NO_VA]),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
