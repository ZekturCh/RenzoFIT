// assets/js/pages/dashboard.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { STUDENT_STATUS, SESSION_STATUS } from "../constants.js";
import { formatShortDate, getTodayISO, getSessionLabel } from "../utils.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

if (session) {
  renderSidebar(session.profile);
  await loadDashboard();
}

async function loadDashboard() {
  const studentsSnap = await getDocs(collection(db, "students"));
  const sessionsSnap = await getDocs(collection(db, "sessions"));

  const students = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const sessions = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const todayISO = getTodayISO();

  document.querySelector("#activeStudents").textContent =
    students.filter((s) => s.status === STUDENT_STATUS.ACTIVE).length;

  document.querySelector("#todaySessions").textContent =
    sessions.filter((s) => s.dateISO === todayISO && s.status === SESSION_STATUS.SCHEDULED).length;

  document.querySelector("#pendingPayments").textContent =
    students.filter((s) => s.paymentStatus === "pending" || s.paymentStatus === "partial").length;

  document.querySelector("#lowSessions").textContent =
    students.filter((s) => Number(s.remainingSessions || 0) <= 2 && s.status === STUDENT_STATUS.ACTIVE).length;

  renderNextSessions(sessions);
}

function renderNextSessions(sessions) {
  const container = document.querySelector("#nextSessionsList");
  const now = new Date();

  const upcoming = sessions
    .filter((s) => s.status === SESSION_STATUS.SCHEDULED)
    .sort((a, b) => {
      const dateA = a.startAt?.toDate ? a.startAt.toDate().getTime() : 0;
      const dateB = b.startAt?.toDate ? b.startAt.toDate().getTime() : 0;
      return dateA - dateB;
    })
    .filter((s) => {
      const date = s.startAt?.toDate ? s.startAt.toDate() : null;
      return date && date >= now;
    })
    .slice(0, 8);

  if (upcoming.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay sesiones próximas.</p>`;
    return;
  }

  container.innerHTML = upcoming.map((s) => `
    <article class="session-card">
      <div>
        <strong>${s.studentName}</strong>
        <p>${formatShortDate(s.startAt)} · ${s.startTime}</p>
      </div>
      <span class="badge">${getSessionLabel(s.status)}</span>
    </article>
  `).join("");
}
