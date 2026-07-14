// assets/js/pages/detalle-estudiante.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { PAYMENT_STATUS, SESSION_STATUS } from "../constants.js";
import {
  getTodayISO,
  formatCurrency,
  getPaymentLabel,
  getSessionLabel,
  generateSessionDates,
  combineDateTime
} from "../utils.js";

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

const params = new URLSearchParams(window.location.search);
const studentId = params.get("id");

let student = null;
let studentSessions = [];
let pendingSessions = [];
let selectedDates = [];
let calendarDate = new Date();

if (session) {
  renderSidebar(session.profile);

  if (!studentId) {
    alert("No se encontró el estudiante.");
    window.location.href = "./estudiantes.html";
  } else {
    initPage();
  }
}

async function initPage() {
  setupEvents();
  setupDatePickers();
  await loadStudentDetail();
}

function setupEvents() {
  document.querySelector("#saveStudentBtn").addEventListener("click", saveStudentData);
  document.querySelector("#prevMonthBtn").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#nextMonthBtn").addEventListener("click", () => changeMonth(1));
  document.querySelector("#saveCalendarBtn").addEventListener("click", saveEditableCalendar);
  document.querySelector("#addPackBtn").addEventListener("click", addNewPack);

  document.querySelectorAll(".new-pack-quick").forEach((button) => {
    button.addEventListener("click", () => {
      const days = button.dataset.days.split(",");

      document.querySelectorAll("input[name='newPackDay']").forEach((checkbox) => {
        checkbox.checked = days.includes(checkbox.value);
      });
    });
  });
}

function setupDatePickers() {
  const todayISO = getTodayISO();

  flatpickr("#newPackStartDate", {
    locale: "es",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    defaultDate: todayISO,
    allowInput: false,
    disableMobile: true
  });
}

async function loadStudentDetail() {
  const studentSnap = await getDoc(doc(db, "students", studentId));

  if (!studentSnap.exists()) {
    alert("Este estudiante no existe.");
    window.location.href = "./estudiantes.html";
    return;
  }

  student = {
    id: studentSnap.id,
    ...studentSnap.data()
  };

  await loadStudentSessions();

  fillStudentData();
  renderSummary();
  prepareEditableCalendar();
  renderHistory();
}

async function loadStudentSessions() {
  const q = query(
    collection(db, "sessions"),
    where("studentId", "==", studentId)
  );

  const snapshot = await getDocs(q);

  studentSessions = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .sort((a, b) => {
      const dateA = a.startAt?.toDate ? a.startAt.toDate().getTime() : 0;
      const dateB = b.startAt?.toDate ? b.startAt.toDate().getTime() : 0;
      return dateA - dateB;
    });

  pendingSessions = studentSessions.filter((item) => {
    return item.status === SESSION_STATUS.SCHEDULED;
  });
}

function fillStudentData() {
  document.querySelector("#studentTitle").textContent = student.fullName || "Estudiante";
  document.querySelector("#studentSubtitle").textContent = `${student.phone || "-"} · ${student.objective || "-"}`;

  document.querySelector("#editFirstName").value = student.firstName || "";
  document.querySelector("#editLastName").value = student.lastName || "";
  document.querySelector("#editPhone").value = student.phone || "";
  document.querySelector("#editObjective").value = student.objective || "Otro";
  document.querySelector("#editDefaultTime").value = student.defaultTime || "07:00";
  document.querySelector("#editDuration").value = String(student.sessionDurationMinutes || 60);
  document.querySelector("#editNotes").value = student.notes || "";

  document.querySelector("#newPackTime").value = student.defaultTime || "07:00";
}

function renderSummary() {
  document.querySelector("#totalSessionsBox").textContent = student.totalSessions || 0;
  document.querySelector("#usedSessionsBox").textContent = student.usedSessions || 0;
  document.querySelector("#remainingSessionsBox").textContent = student.remainingSessions || 0;
  document.querySelector("#paymentStatusBox").textContent = getPaymentLabel(student.paymentStatus);
}

async function saveStudentData() {
  const firstName = document.querySelector("#editFirstName").value.trim();
  const lastName = document.querySelector("#editLastName").value.trim();
  const phone = document.querySelector("#editPhone").value.trim();

  if (!firstName || !phone) {
    alert("Nombre y teléfono son obligatorios.");
    return;
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const payload = {
    firstName,
    lastName,
    fullName,
    phone,
    objective: document.querySelector("#editObjective").value,
    defaultTime: document.querySelector("#editDefaultTime").value,
    sessionDurationMinutes: Number(document.querySelector("#editDuration").value || 60),
    notes: document.querySelector("#editNotes").value.trim(),
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, "students", studentId), payload);

  // También actualiza nombre en sesiones pendientes para que no quede antiguo.
  for (const item of pendingSessions) {
    await updateDoc(doc(db, "sessions", item.id), {
      studentName: fullName,
      durationMinutes: payload.sessionDurationMinutes,
      updatedAt: serverTimestamp()
    });
  }

  alert("Datos actualizados.");
  await loadStudentDetail();
}

function prepareEditableCalendar() {
  selectedDates = pendingSessions
    .map((item) => item.dateISO)
    .filter(Boolean);

  const firstPending = pendingSessions[0];

  if (firstPending?.startAt?.toDate) {
    calendarDate = firstPending.startAt.toDate();
  } else {
    calendarDate = new Date();
  }

  document.querySelector("#targetDatesCount").textContent = Number(student.remainingSessions || 0);
  renderEditableCalendar();
}

function renderEditableCalendar() {
  const calendar = document.querySelector("#editableCalendar");

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const monthTitle = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric"
  }).format(firstDay);

  document.querySelector("#calendarMonthTitle").textContent = capitalize(monthTitle);
  document.querySelector("#selectedDatesCount").textContent = selectedDates.length;
  document.querySelector("#targetDatesCount").textContent = Number(student.remainingSessions || 0);

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

  let html = "";

  html += `<div class="calendar-weekdays">`;
  html += weekDays.map((day) => `<span>${day}</span>`).join("");
  html += `</div>`;

  html += `<div class="calendar-days">`;

  const offset = getMondayOffset(firstDay);

  for (let i = 0; i < offset; i++) {
    html += `<button class="calendar-day empty" type="button" disabled></button>`;
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const iso = toISODate(date);

    const selected = selectedDates.includes(iso);
    const isPast = iso < getTodayISO();

    html += `
      <button 
        class="calendar-day ${selected ? "selected" : ""} ${isPast ? "past" : ""}"
        type="button"
        data-date="${iso}"
      >
        ${day}
      </button>
    `;
  }

  html += `</div>`;

  calendar.innerHTML = html;

  document.querySelectorAll(".calendar-day[data-date]").forEach((button) => {
    button.addEventListener("click", () => toggleCalendarDate(button.dataset.date));
  });
}

function toggleCalendarDate(dateISO) {
  const target = Number(student.remainingSessions || 0);
  const exists = selectedDates.includes(dateISO);

  if (exists) {
    selectedDates = selectedDates.filter((item) => item !== dateISO);
  } else {
    if (selectedDates.length >= target) {
      alert(`Solo puedes seleccionar ${target} sesiones.`);
      return;
    }

    selectedDates.push(dateISO);
  }

  selectedDates.sort();
  renderEditableCalendar();
}

async function saveEditableCalendar() {
  const target = Number(student.remainingSessions || 0);

  if (selectedDates.length !== target) {
    alert(`Debes seleccionar exactamente ${target} fechas.`);
    return;
  }

  const confirmSave = confirm(
    "Esto reemplazará las sesiones pendientes actuales. No tocará el historial ya asistido o faltado. ¿Continuar?"
  );

  if (!confirmSave) return;

  const defaultTime = document.querySelector("#editDefaultTime").value || student.defaultTime || "07:00";
  const durationMinutes = Number(document.querySelector("#editDuration").value || student.sessionDurationMinutes || 60);

  for (const item of pendingSessions) {
    await deleteDoc(doc(db, "sessions", item.id));
  }

  for (let i = 0; i < selectedDates.length; i++) {
    const dateISO = selectedDates[i];
    const startDateTime = combineDateTime(dateISO, defaultTime);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    await addDoc(collection(db, "sessions"), {
      studentId,
      studentName: student.fullName,

      sessionNumber: Number(student.usedSessions || 0) + i + 1,
      packageSessionIndex: Number(student.usedSessions || 0) + i + 1,

      dateISO,
      startTime: defaultTime,
      startAt: Timestamp.fromDate(startDateTime),
      endAt: Timestamp.fromDate(endDateTime),
      durationMinutes,

      status: SESSION_STATUS.SCHEDULED,
      countsAsUsed: false,
      manuallyReplanned: true,
      notes: "",

      createdByEmail: session.profile.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await updateDoc(doc(db, "students", studentId), {
    defaultTime,
    sessionDurationMinutes: durationMinutes,
    updatedAt: serverTimestamp()
  });

  alert("Calendario actualizado.");
  await loadStudentDetail();
}

async function addNewPack() {
  const packSessions = Number(document.querySelector("#newPackSessions").value || 0);
  const startDateISO = document.querySelector("#newPackStartDate").value;
  const defaultTime = document.querySelector("#newPackTime").value || student.defaultTime || "07:00";

  const selectedDays = [...document.querySelectorAll("input[name='newPackDay']:checked")]
    .map((input) => input.value);

  if (!packSessions || !startDateISO) {
    alert("Completa pack y fecha de inicio.");
    return;
  }

  if (selectedDays.length === 0) {
    alert("Selecciona al menos un día para el nuevo pack.");
    return;
  }

  if (selectedDays.length > 4) {
    alert("Máximo 4 días por semana.");
    return;
  }

  const confirmAdd = confirm(`¿Agregar ${packSessions} sesiones al estudiante?`);
  if (!confirmAdd) return;

  const durationMinutes = Number(student.sessionDurationMinutes || 60);

  const sessionDates = generateSessionDates({
    startDateISO,
    selectedDays,
    totalSessions: packSessions
  });

  const oldTotalSessions = Number(student.totalSessions || 0);
  const oldRemainingSessions = Number(student.remainingSessions || 0);
  const oldPaidAmount = Number(student.paidAmount || 0);
  const oldRemainingAmount = Number(student.remainingAmount || 0);

  const newPackTotalAmount = Number(document.querySelector("#newPackTotalAmount").value || 0);
  const newPackPaidAmount = Number(document.querySelector("#newPackPaidAmount").value || 0);

  const newTotalSessions = oldTotalSessions + packSessions;
  const newRemainingSessions = oldRemainingSessions + packSessions;

  const newPaidAmountTotal = oldPaidAmount + newPackPaidAmount;
  const newRemainingAmountTotal = Math.max(oldRemainingAmount + newPackTotalAmount - newPackPaidAmount, 0);

  let paymentStatus = PAYMENT_STATUS.PENDING;

  if (newRemainingAmountTotal <= 0 && newPaidAmountTotal > 0) {
    paymentStatus = PAYMENT_STATUS.PAID;
  } else if (newPaidAmountTotal > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIAL;
  }

  for (let i = 0; i < sessionDates.length; i++) {
    const dateISO = sessionDates[i];
    const startDateTime = combineDateTime(dateISO, defaultTime);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    await addDoc(collection(db, "sessions"), {
      studentId,
      studentName: student.fullName,

      sessionNumber: oldTotalSessions + i + 1,
      packageSessionIndex: oldTotalSessions + i + 1,

      dateISO,
      startTime: defaultTime,
      startAt: Timestamp.fromDate(startDateTime),
      endAt: Timestamp.fromDate(endDateTime),
      durationMinutes,

      status: SESSION_STATUS.SCHEDULED,
      countsAsUsed: false,
      generatedFromNewPack: true,
      notes: "",

      createdByEmail: session.profile.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await updateDoc(doc(db, "students", studentId), {
    totalSessions: newTotalSessions,
    remainingSessions: newRemainingSessions,
    paidAmount: newPaidAmountTotal,
    remainingAmount: newRemainingAmountTotal,
    paymentStatus,
    defaultTime,
    updatedAt: serverTimestamp()
  });

  if (newPackPaidAmount > 0) {
    await addDoc(collection(db, "payments"), {
      studentId,
      studentName: student.fullName,
      amount: newPackPaidAmount,
      method: document.querySelector("#newPackPaymentMethod").value,
      note: `Pago por nuevo pack de ${packSessions} sesiones`,
      createdByEmail: session.profile.email,
      createdAt: serverTimestamp()
    });
  }

  alert("Nuevo pack agregado correctamente.");
  await loadStudentDetail();
}

function renderHistory() {
  const container = document.querySelector("#sessionsHistoryList");

  if (studentSessions.length === 0) {
    container.innerHTML = `<p class="empty-message">No hay sesiones registradas.</p>`;
    return;
  }

  container.innerHTML = studentSessions.map((item) => {
    const dateLabel = item.startAt?.toDate
      ? new Intl.DateTimeFormat("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(item.startAt.toDate())
      : item.dateISO || "-";

    return `
      <article class="session-card">
        <div class="card-main">
          <div>
            <strong>${dateLabel} · ${item.startTime || "--:--"}</strong>
            <p>Sesión ${item.sessionNumber || "-"}</p>
          </div>

          <span class="badge ${getSessionBadgeClass(item.status)}">
            ${getSessionLabel(item.status)}
          </span>
        </div>
      </article>
    `;
  }).join("");
}

function changeMonth(amount) {
  calendarDate.setMonth(calendarDate.getMonth() + amount);
  renderEditableCalendar();
}

function getMondayOffset(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSessionBadgeClass(status) {
  if (status === SESSION_STATUS.ATTENDED) return "badge-green";
  if (status === SESSION_STATUS.MISSED) return "badge-red";
  if (status === SESSION_STATUS.CANCELLED) return "badge-red";
  if (status === SESSION_STATUS.POSTPONED) return "badge-yellow";
  return "";
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
