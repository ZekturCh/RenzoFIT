// assets/js/pages/estudiantes.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { formatCurrency, getPaymentLabel } from "../utils.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let students = [];

if (session) {
  renderSidebar(session.profile);
  document.querySelector("#studentSearch").addEventListener("input", renderStudents);
  await loadStudents();
}

async function loadStudents() {
  const snapshot = await getDocs(collection(db, "students"));

  students = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));

  renderStudents();
}

function renderStudents() {
  const container = document.querySelector("#studentsList");
  const search = document.querySelector("#studentSearch").value.toLowerCase().trim();

  const filtered = students.filter((student) => {
    const text = `
      ${student.fullName || ""}
      ${student.phone || ""}
      ${student.objective || ""}
    `.toLowerCase();

    return text.includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay estudiantes registrados.</p>`;
    return;
  }

  container.innerHTML = filtered.map((student) => `
    <article class="student-card">
      <div class="card-main">
        <div>
          <strong>${student.fullName}</strong>
          <p>${student.phone || "-"}</p>
          <p>Objetivo: ${student.objective || "-"}</p>
        </div>

        <span class="badge ${student.paymentStatus === "paid" ? "badge-green" : "badge-red"}">
          ${getPaymentLabel(student.paymentStatus)}
        </span>
      </div>

      <div class="student-progress">
        <div>
          <span>Pack</span>
          <strong>${student.totalSessions || 0}</strong>
        </div>

        <div>
          <span>Usadas</span>
          <strong>${student.usedSessions || 0}</strong>
        </div>

        <div>
          <span>Restantes</span>
          <strong>${student.remainingSessions || 0}</strong>
        </div>
      </div>

      <div class="payment-line">
        <span>Pagado: ${formatCurrency(student.paidAmount || 0)}</span>
        <span>Falta: ${formatCurrency(student.remainingAmount || 0)}</span>
      </div>
    </article>
  `).join("");
}
