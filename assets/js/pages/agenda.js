// assets/js/pages/agenda.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { SESSION_STATUS } from "../constants.js";
import { getTodayISO, getSessionLabel } from "../utils.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

let selectedDate = getTodayISO();
let sessions = [];
let selectedSession = null;

let agendaDatePicker = null;
let rescheduleDatePicker = null;
let rescheduleTimePicker = null;

if (session) {
  renderSidebar(session.profile);
  initAgenda();
  await loadSessions();
}

function initAgenda() {
  setupDatePickers();

  document.querySelector("#todayBtn").addEventListener("click", async () => {
    selectedDate = getTodayISO();

    if (agendaDatePicker) {
      agendaDatePicker.setDate(selectedDate, true);
    }

    updateDateLabel();
    await loadSessions();
  });

  document.querySelector("#closeRescheduleModal").addEventListener("click", closeRescheduleModal);
  document.querySelector("#saveRescheduleBtn").addEventListener("click", saveReschedule);

  updateDateLabel();
}

function setupDatePickers() {
  agendaDatePicker = flatpickr("#agendaDate", {
    locale: "es",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    defaultDate: selectedDate,
    allowInput: false,
    disableMobile: true,
    onChange: async function(selectedDates, dateStr) {
      selectedDate = dateStr;
      updateDateLabel();
      await loadSessions();
    }
  });

  rescheduleDatePicker = flatpickr("#newSessionDate", {
    locale: "es",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: false,
    disableMobile: true
  });

  rescheduleTimePicker = flatpickr("#newSessionTime", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
    altInput: true,
    altFormat: "h:i K",
    time_24hr: false,
    minuteIncrement: 15,
    allowInput: false,
    disableMobile: true
  });
}

async function loadSessions() {
  const container = document.querySelector("#sessionsList");

  try {
    container.innerHTML = `<p class="empty-message">Cargando sesiones...</p>`;

    const q = query(
      collection(db, "sessions"),
      where("dateISO", "==", selectedDate)
    );

    const snapshot = await getDocs(q);

    sessions = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    renderSessions();
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <p class="empty-message">
        No se pudo cargar la agenda. Revisa las reglas de Firestore.
      </p>
    `;
  }
}

function renderSessions() {
  const container = document.querySelector("#sessionsList");

  if (sessions.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay sesiones para esta fecha.</p>`;
    return;
  }

  container.innerHTML = sessions.map((s) => `
    <article class="session-card ${s.status}">
      <div class="card-main">
        <div>
          <strong>${s.startTime || "--:--"} · ${s.studentName || "Sin nombre"}</strong>
          <p>Sesión ${s.sessionNumber || "-"}</p>
          <p>Estado: ${getSessionLabel(s.status)}</p>
        </div>

        <span class="badge ${getStatusBadgeClass(s.status)}">
          ${getSessionLabel(s.status)}
        </span>
      </div>

      <div class="action-grid">
        <button
          class="btn-success attend-btn"
          data-id="${s.id}"
          ${s.status !== SESSION_STATUS.SCHEDULED ? "disabled" : ""}
        >
          Asistió
        </button>

        <button
          class="btn-secondary postpone-btn"
          data-id="${s.id}"
          ${s.status !== SESSION_STATUS.SCHEDULED ? "disabled" : ""}
        >
          Postergar
        </button>

        <button
          class="btn-danger missed-btn"
          data-id="${s.id}"
          ${s.status !== SESSION_STATUS.SCHEDULED ? "disabled" : ""}
        >
          Falta
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".attend-btn").forEach((btn) => {
    btn.addEventListener("click", () => markAttended(btn.dataset.id));
  });

  document.querySelectorAll(".postpone-btn").forEach((btn) => {
    btn.addEventListener("click", () => openRescheduleModal(btn.dataset.id));
  });

  document.querySelectorAll(".missed-btn").forEach((btn) => {
    btn.addEventListener("click", () => markMissed(btn.dataset.id));
  });
}

async function markAttended(sessionId) {
  const current = sessions.find((s) => s.id === sessionId);
  if (!current) return;

  const confirmAction = confirm("¿Marcar como asistió y descontar 1 sesión?");
  if (!confirmAction) return;

  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: SESSION_STATUS.ATTENDED,
      countsAsUsed: true,
      attendedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const studentRef = doc(db, "students", current.studentId);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {
      const student = studentSnap.data();
      const remaining = Math.max(Number(student.remainingSessions || 0) - 1, 0);

      await updateDoc(studentRef, {
        usedSessions: increment(1),
        remainingSessions: remaining,
        updatedAt: serverTimestamp()
      });
    }

    await loadSessions();
  } catch (error) {
    console.error(error);
    alert("No se pudo marcar asistencia.");
  }
}

async function markMissed(sessionId) {
  const current = sessions.find((s) => s.id === sessionId);
  if (!current) return;

  const shouldDiscount = confirm("¿La falta descuenta sesión? Aceptar = sí, Cancelar = no.");

  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: SESSION_STATUS.MISSED,
      countsAsUsed: shouldDiscount,
      updatedAt: serverTimestamp()
    });

    if (shouldDiscount) {
      const studentRef = doc(db, "students", current.studentId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const student = studentSnap.data();
        const remaining = Math.max(Number(student.remainingSessions || 0) - 1, 0);

        await updateDoc(studentRef, {
          usedSessions: increment(1),
          remainingSessions: remaining,
          updatedAt: serverTimestamp()
        });
      }
    }

    await loadSessions();
  } catch (error) {
    console.error(error);
    alert("No se pudo marcar la falta.");
  }
}

function openRescheduleModal(sessionId) {
  selectedSession = sessions.find((s) => s.id === sessionId);
  if (!selectedSession) return;

  const originalDate = selectedSession.dateISO || selectedDate;
  const originalTime = selectedSession.startTime || "07:00";

  if (rescheduleDatePicker) {
    rescheduleDatePicker.setDate(originalDate, true);
  } else {
    document.querySelector("#newSessionDate").value = originalDate;
  }

  if (rescheduleTimePicker) {
    rescheduleTimePicker.setDate(originalTime, true);
  } else {
    document.querySelector("#newSessionTime").value = originalTime;
  }

  document.querySelector("#rescheduleModal").classList.remove("hidden");
}

function closeRescheduleModal() {
  selectedSession = null;
  document.querySelector("#rescheduleModal").classList.add("hidden");
}

async function saveReschedule() {
  if (!selectedSession) return;

  const newDate = document.querySelector("#newSessionDate").value;
  const newTime = document.querySelector("#newSessionTime").value;

  if (!newDate || !newTime) {
    alert("Selecciona fecha y hora.");
    return;
  }

  try {
    const startDateTime = new Date(`${newDate}T${newTime}:00`);
    const endDateTime = new Date(startDateTime);

    endDateTime.setMinutes(
      endDateTime.getMinutes() + Number(selectedSession.durationMinutes || 60)
    );

    await updateDoc(doc(db, "sessions", selectedSession.id), {
      dateISO: newDate,
      startTime: newTime,
      startAt: Timestamp.fromDate(startDateTime),
      endAt: Timestamp.fromDate(endDateTime),
      status: SESSION_STATUS.SCHEDULED,
      rescheduledFrom: selectedSession.dateISO,
      updatedAt: serverTimestamp()
    });

    closeRescheduleModal();
    await loadSessions();
  } catch (error) {
    console.error(error);
    alert("No se pudo reprogramar la sesión.");
  }
}

function updateDateLabel() {
  const label = document.querySelector("#agendaDateLabel");
  if (!label || !selectedDate) return;

  const [year, month, day] = selectedDate.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  label.textContent = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function getStatusBadgeClass(status) {
  if (status === SESSION_STATUS.ATTENDED) return "badge-green";
  if (status === SESSION_STATUS.MISSED) return "badge-red";
  if (status === SESSION_STATUS.POSTPONED) return "badge-yellow";
  if (status === SESSION_STATUS.CANCELLED) return "badge-red";

  return "";
}
