// assets/js/services/logs.service.js

import { db } from "../firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createLog({ workOrderId = null, action, message, profile }) {
  await addDoc(collection(db, "activityLogs"), {
    workOrderId,
    action,
    message,
    createdByEmail: profile?.email || "",
    createdByName: profile?.name || "",
    createdAt: serverTimestamp()
  });
}

export async function getLogsByWorkOrder(workOrderId) {
  const q = query(
    collection(db, "activityLogs"),
    where("workOrderId", "==", workOrderId),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
