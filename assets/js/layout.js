// assets/js/layout.js

import { logoutUser } from "./auth.js";

export function renderSidebar(profile) {
  const sidebar = document.querySelector("#sidebar");
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-mark">FIT</div>
      <div>
        <strong>Coach Admin</strong>
        <span>${profile.name || "Coach"}</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <a href="./index.html">Dashboard</a>
      <a href="./nuevo-estudiante.html">Nuevo estudiante</a>
      <a href="./estudiantes.html">Estudiantes</a>
      <a href="./agenda.html">Agenda</a>
    </nav>

    <button id="logoutBtn" class="btn-logout">Cerrar sesión</button>
  `;

  document.querySelector("#logoutBtn")?.addEventListener("click", logoutUser);
}
