// assets/js/pages/login.js

import { loginUser } from "../auth.js";
import { ROLES } from "../constants.js";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  const email = document.querySelector("#email").value.trim().toLowerCase();
  const password = document.querySelector("#password").value.trim();

  if (!email || !password) {
    loginError.textContent = "Ingresa correo y contraseña.";
    return;
  }

  try {
    const session = await loginUser(email, password);

    if (session.profile.role === ROLES.ADMIN) {
      window.location.href = "./index.html";
      return;
    }

    if (session.profile.role === ROLES.BASIC) {
      window.location.href = "./servicios-activos.html";
      return;
    }

    loginError.textContent = "Rol no reconocido.";
  } catch (error) {
    console.error(error);
    loginError.textContent = "Correo, contraseña o usuario inválido.";
  }
});
