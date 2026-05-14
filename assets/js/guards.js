// assets/js/guards.js

import { auth } from "./firebase-config.js";
import { getUserProfile } from "./auth.js";
import { ROLES } from "./constants.js";

export function requireAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        window.location.href = "./login.html";
        return;
      }

      const profile = await getUserProfile(firebaseUser.uid);

      if (!profile || profile.active !== true) {
        window.location.href = "./login.html";
        return;
      }

      resolve({
        firebaseUser,
        profile
      });
    });
  });
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.profile.role !== ROLES.ADMIN) {
    window.location.href = "./servicios-activos.html";
    return null;
  }

  return session;
}

export async function requireAdminOrBasic() {
  const session = await requireAuth();

  const role = session.profile.role;

  if (role !== ROLES.ADMIN && role !== ROLES.BASIC) {
    window.location.href = "./login.html";
    return null;
  }

  return session;
}
