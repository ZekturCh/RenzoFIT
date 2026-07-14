// assets/js/pages/login.js

import { loginUser } from "../auth.js";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  const email = document.querySelector("#email").value.trim().toLowerCase();
  const password = document.querySelector("#password").value.trim();

  try {
    await loginUser(email, password);
    window.location.href = "./index.html";
  } catch (error) {
    console.error(error);
    loginError.textContent = "Correo, contraseña o usuario inválido.";
  }
});
