// assets/js/services/payments.service.js

import { db } from "../firebase-config.js";
import { ORDER_STATUS } from "../constants.js";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createPayment(order, paymentData, profile) {
  const amount = Number(paymentData.amount || 0);
  const newPaidAmount = Number(order.paidAmount || 0) + amount;
  const newRemaining = Number(order.total || 0) - newPaidAmount;

  const nextStatus = newRemaining <= 0
    ? ORDER_STATUS.POR_RECOGER
    : ORDER_STATUS.POR_COBRAR;

  await addDoc(collection(db, "payments"), {
    workOrderId: order.id,
    amount,
    method: paymentData.method || "efectivo",
    note: paymentData.note || "",
    createdByEmail: profile.email,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "workOrders", order.id), {
    paidAmount: newPaidAmount,
    remainingAmount: Math.max(newRemaining, 0),
    status: nextStatus,
    updatedAt: serverTimestamp()
  });

  return {
    paidAmount: newPaidAmount,
    remainingAmount: Math.max(newRemaining, 0),
    status: nextStatus
  };
}

export async function getPaymentsByWorkOrder(workOrderId) {
  const q = query(
    collection(db, "payments"),
    where("workOrderId", "==", workOrderId),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
