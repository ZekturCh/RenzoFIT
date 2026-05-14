// assets/js/services/inventory.service.js

import { db } from "../firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function createProduct(data, profile) {
  const isAdmin = profile.role === "admin";

  const payload = {
    name: data.name || "",
    category: data.category || "Pendiente",
    stock: Number(data.stock || 0),
    unit: data.unit || "unidad",
    approved: isAdmin,
    pendingApproval: !isAdmin,
    createdByEmail: profile.email,
    createdByRole: profile.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (isAdmin) {
    payload.purchasePrice = Number(data.purchasePrice || 0);
    payload.salePrice = Number(data.salePrice || 0);
  }

  const ref = await addDoc(collection(db, "inventory"), payload);
  return ref.id;
}

export async function getApprovedProducts() {
  const q = query(
    collection(db, "inventory"),
    where("approved", "==", true),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getPendingProducts() {
  const q = query(
    collection(db, "inventory"),
    where("pendingApproval", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function approveProduct(productId, prices = {}) {
  await updateDoc(doc(db, "inventory", productId), {
    approved: true,
    pendingApproval: false,
    purchasePrice: Number(prices.purchasePrice || 0),
    salePrice: Number(prices.salePrice || 0),
    updatedAt: serverTimestamp()
  });
}

export async function denyProduct(productId) {
  await deleteDoc(doc(db, "inventory", productId));
}

export async function updateProduct(productId, data) {
  await updateDoc(doc(db, "inventory", productId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function decreaseProductStock(productId, quantity) {
  await updateDoc(doc(db, "inventory", productId), {
    stock: increment(-Number(quantity || 0)),
    updatedAt: serverTimestamp()
  });
}

export async function increaseProductStock(productId, quantity) {
  await updateDoc(doc(db, "inventory", productId), {
    stock: increment(Number(quantity || 0)),
    updatedAt: serverTimestamp()
  });
}

export async function getProductById(productId) {
  const snap = await getDoc(doc(db, "inventory", productId));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}
