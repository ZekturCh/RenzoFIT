// assets/js/layout.js

import { logoutUser } from "./auth.js";
import { ROLES } from "./constants.js";

export function renderSidebar(profile) {
  const sidebar = document.querySelector("#sidebar");

  if (!sidebar) return;

  const isAdmin = profile.role === ROLES.ADMIN;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <img src="./assets/img/logo-tesen.png" alt="Tesen Factory">
    </div>

    <div class="sidebar-user">
      <strong>${profile.name || "Usuario"}</strong>
      <span>${isAdmin ? "Admin" : "Básico"}</span>
    </div>

    <nav class="sidebar-nav">
      ${
        isAdmin
          ? `
            <a href="./index.html">Dashboard</a>
            <a href="./cotizar.html">Registrar Cotización</a>
            <a href="./servicios-activos.html">Servicios Activos</a>
            <a href="./servicios-finales.html">Servicios Finales</a>
            <a href="./directorio.html">Directorio</a>
            <a href="./inventario.html">Inventario</a>
            <a href="./total-servicios.html">Total de Servicios</a>
          `
          : `
            <a href="./servicios-activos.html">Mis Servicios</a>
            <a href="./inventario.html">Inventario</a>
          `
      }
    </nav>

    <button id="logoutBtn" class="btn-logout">Cerrar sesión</button>
  `;

  const logoutBtn = document.querySelector("#logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logoutUser();
    });
  }
}
