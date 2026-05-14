// assets/js/services/users.service.js

import { db } from "../firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function getUserByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  const userRef = doc(db, "users", cleanEmail);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  return {
    id: userSnap.id,
    ...userSnap.data()
  };
}

export async function getActiveBasicUsers() {
  const q = query(
    collection(db, "users"),
    where("role", "==", "basic"),
    where("active", "==", true),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getAllUsers() {
  const q = query(collection(db, "users"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function createOrUpdateUserProfile(email, data) {
  const cleanEmail = email.trim().toLowerCase();

  const payload = {
    email: cleanEmail,
    name: data.name || "",
    role: data.role || "basic",
    active: data.active === true,
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "users", cleanEmail), payload, { merge: true });
}

export async function updateUserStatus(email, active) {
  const cleanEmail = email.trim().toLowerCase();

  await updateDoc(doc(db, "users", cleanEmail), {
    active,
    updatedAt: serverTimestamp()
  });
}
