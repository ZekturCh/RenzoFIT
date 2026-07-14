// assets/js/pages/dashboard.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { STUDENT_STATUS, SESSION_STATUS } from "../constants.js";
import { formatShortDate, getTodayISO, getSessionLabel } from "../utils.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

if (session) {
  renderSidebar(session.profile);
  await loadDashboard();
}

async function loadDashboard() {
  const studentsSnap = await getDocs(collection(db, "students"));
  const sessionsSnap = await getDocs(collection(db, "sessions"));

  const students = studentsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  const sessions = sessionsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  const todayISO = getTodayISO();

  document.querySelector("#activeStudents").textContent =
    students.filter((student) => student.status === STUDENT_STATUS.ACTIVE).length;

  document.querySelector("#todaySessions").textContent =
    sessions.filter((session) =>
      session.dateISO === todayISO &&
      session.status === SESSION_STATUS.SCHEDULED
    ).length;

  document.querySelector("#pendingPayments").textContent =
    students.filter((student) =>
      student.paymentStatus === "pending" ||
      student.paymentStatus === "partial"
    ).length;

  document.querySelector("#lowSessions").textContent =
    students.filter((student) =>
      Number(student.remainingSessions || 0) <= 2 &&
      student.status === STUDENT_STATUS.ACTIVE
    ).length;

  renderDashboardSessions(sessions);
}

function renderDashboardSessions(sessions) {
  const container = document.querySelector("#nextSessionsList");
  const todayISO = getTodayISO();

  const scheduledSessions = sessions
    .filter((session) => session.status === SESSION_STATUS.SCHEDULED)
    .sort((a, b) => {
      const dateA = a.startAt?.toDate ? a.startAt.toDate().getTime() : 0;
      const dateB = b.startAt?.toDate ? b.startAt.toDate().getTime() : 0;
      return dateA - dateB;
    });

  const todaySessions = scheduledSessions.filter((session) => {
    return session.dateISO === todayISO;
  });

  const futureSessions = scheduledSessions
    .filter((session) => {
      return session.dateISO > todayISO;
    })
    .slice(0, 5);

  if (todaySessions.length === 0 && futureSessions.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay sesiones próximas.</p>`;
    return;
  }

  let html = "";

  html += `
    <div class="dashboard-session-group">
      <h3>Sesiones de hoy</h3>
  `;

  if (todaySessions.length === 0) {
    html += `<p class="empty-message">No hay sesiones para hoy.</p>`;
  } else {
    html += todaySessions.map((session) => renderSessionCard(session, true)).join("");
  }

  html += `</div>`;

  html += `
    <div class="dashboard-session-group">
      <h3>Próximas 5 sesiones</h3>
  `;

  if (futureSessions.length === 0) {
    html += `<p class="empty-message">No hay próximas sesiones registradas.</p>`;
  } else {
    html += futureSessions.map((session) => renderSessionCard(session, false)).join("");
  }

  html += `</div>`;

  container.innerHTML = html;
}

function renderSessionCard(session, isToday) {
  return `
    <article class="session-card dashboard-session-card">
      <div class="card-main">
        <div>
          <strong>${session.studentName || "Sin nombre"}</strong>
          <p>
            ${isToday ? "Hoy" : formatShortDate(session.startAt)}
            · ${session.startTime || "--:--"}
          </p>
          <p>Sesión ${session.sessionNumber || "-"}</p>
        </div>

        <span class="badge">
          ${getSessionLabel(session.status)}
        </span>
      </div>

      <a class="btn-secondary mini-link" href="./agenda.html">
        Ir a agenda
      </a>
    </article>
  `;
}
