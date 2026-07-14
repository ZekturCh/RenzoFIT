// assets/js/guards.js

import { auth } from "./firebase-config.js";
import { getCurrentProfile } from "./auth.js";

export function requireAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        window.location.href = "./login.html";
        return;
      }

      resolve({
        firebaseUser,
        profile: getCurrentProfile(firebaseUser)
      });
    });
  });
}

// Para no modificar todos los pages que ya usan requireAdmin()
export async function requireAdmin() {
  return await requireAuth();
}
