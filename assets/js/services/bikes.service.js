// assets/js/services/bikes.service.js

import { db } from "../firebase-config.js";

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createBike(bikeData) {
  const payload = {
    clientId: bikeData.clientId,
    brand: bikeData.brand || "",
    model: bikeData.model || "",
    mileage: Number(bikeData.mileage || 0),
    plate: bikeData.plate || "",
    color: bikeData.color || "",
    vin: bikeData.vin || "",
    year: Number(bikeData.year || 0),
    transmission: bikeData.transmission || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "bikes"), payload);
  return ref.id;
}

export async function updateBike(bikeId, bikeData) {
  await updateDoc(doc(db, "bikes", bikeId), {
    ...bikeData,
    updatedAt: serverTimestamp()
  });
}

export async function getBikeById(bikeId) {
  if (!bikeId) return null;

  const snap = await getDoc(doc(db, "bikes", bikeId));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}

export async function getBikesByClient(clientId) {
  const q = query(
    collection(db, "bikes"),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
