// assets/js/auth.js

import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const userProfile = await getUserProfileByEmail(cleanEmail);

  if (!userProfile || userProfile.active !== true) {
    await signOut(auth);
    throw new Error("Usuario inactivo o no registrado en Firestore.");
  }

  return {
    firebaseUser: credential.user,
    profile: userProfile
  };
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = "./login.html";
}

export async function getUserProfile(uid) {
  const currentUser = auth.currentUser;

  if (!currentUser?.email) {
    return null;
  }

  return await getUserProfileByEmail(currentUser.email);
}

export async function getUserProfileByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();

  const userRef = doc(db, "users", cleanEmail);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return {
    id: userSnap.id,
    email: cleanEmail,
    ...userSnap.data()
  };
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
