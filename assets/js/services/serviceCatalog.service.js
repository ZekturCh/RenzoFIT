// assets/js/services/serviceCatalog.service.js

import { db } from "../firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createCatalogService(data) {
  const payload = {
    name: data.name || "",
    category: data.category || "General",
    suggestedPrice: Number(data.suggestedPrice || 0),
    active: data.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "serviceCatalog"), payload);
  return ref.id;
}

export async function getActiveCatalogServices() {
  const q = query(
    collection(db, "serviceCatalog"),
    where("active", "==", true),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function updateCatalogService(serviceId, data) {
  await updateDoc(doc(db, "serviceCatalog", serviceId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function disableCatalogService(serviceId) {
  await updateDoc(doc(db, "serviceCatalog", serviceId), {
    active: false,
    updatedAt: serverTimestamp()
  });
}
