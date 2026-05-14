// assets/js/services/clients.service.js

import { db } from "../firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createClient(clientData) {
  const payload = {
    firstName: clientData.firstName || "",
    lastName: clientData.lastName || "",
    documentType: clientData.documentType || "DNI",
    documentNumber: clientData.documentNumber || "",
    phone: clientData.phone || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "clients"), payload);
  return ref.id;
}

export async function updateClient(clientId, clientData) {
  await updateDoc(doc(db, "clients", clientId), {
    ...clientData,
    updatedAt: serverTimestamp()
  });
}

export async function getClientById(clientId) {
  if (!clientId) return null;

  const snap = await getDoc(doc(db, "clients", clientId));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}

export async function getAllClients() {
  const q = query(collection(db, "clients"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
