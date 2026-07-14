// assets/js/auth.js

import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);

  return {
    firebaseUser: credential.user,
    profile: {
      email: credential.user.email,
      name: credential.user.email?.split("@")[0] || "Coach"
    }
  };
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = "./login.html";
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentProfile(firebaseUser) {
  return {
    email: firebaseUser.email,
    name: firebaseUser.email?.split("@")[0] || "Coach"
  };
}
