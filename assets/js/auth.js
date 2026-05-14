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
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userProfile = await getUserProfile(credential.user.uid);

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
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return {
    uid: userSnap.id,
    ...userSnap.data()
  };
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
