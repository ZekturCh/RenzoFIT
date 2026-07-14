// assets/js/pages/nuevo-estudiante.js

import { db } from "../firebase-config.js";
import { requireAdmin } from "../guards.js";
import { renderSidebar } from "../layout.js";
import { PAYMENT_STATUS, STUDENT_STATUS, SESSION_STATUS } from "../constants.js";
import { generateSessionDates, combineDateTime, getTodayISO } from "../utils.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const session = await requireAdmin();

if (session) {
  renderSidebar(session.profile);
  initPage();
}

function initPage() {
  const todayISO = getTodayISO();

  setupDatePickers(todayISO);

  document.querySelectorAll(".quick-days button").forEach((button) => {
    button.addEventListener("click", () => {
      const days = button.dataset.days.split(",");

      document.querySelectorAll("input[name='trainingDay']").forEach((checkbox) => {
        checkbox.checked = days.includes(checkbox.value);
      });
    });
  });

  document.querySelector("#alreadyStarted").addEventListener("change", handleAlreadyStartedChange);
  document.querySelector("#totalSessions").addEventListener("change", updateSessionSummary);
  document.querySelector("#usedSessionsInitial").addEventListener("input", updateSessionSummary);

  document.querySelector("#studentForm").addEventListener("submit", saveStudent);

  updateSessionSummary();
}

function setupDatePickers(todayISO) {
  flatpickr("#startDate", {
    locale: "es",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    defaultDate: todayISO,
    allowInput: false,
    disableMobile: true,
    onChange: function(selectedDates, dateStr) {
      handleStartDateChange(dateStr);
    }
  });

  flatpickr("#continueFromDate", {
    locale: "es",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    defaultDate: todayISO,
    allowInput: false,
    disableMobile: true
  });
}

function handleStartDateChange(startDateISO) {
  if (!startDateISO) return;

  const todayISO = getTodayISO();

  const alreadyStartedCheckbox = document.querySelector("#alreadyStarted");
  const continueFromDate = document.querySelector("#continueFromDate");

  // Si la fecha de inicio es anterior a hoy, asumimos que ya empezó.
  if (startDateISO < todayISO) {
    alreadyStartedCheckbox.checked = true;

    if (continueFromDate._flatpickr) {
      continueFromDate._flatpickr.setDate(todayISO);
    } else {
      continueFromDate.value = todayISO;
    }

    handleAlreadyStartedChange();
  }
}

function handleAlreadyStartedChange() {
  const alreadyStarted = document.querySelector("#alreadyStarted").checked;
  const startedFields = document.querySelector("#startedFields");

  startedFields.classList.toggle("hidden", !alreadyStarted);

  if (!alreadyStarted) {
    document.querySelector("#usedSessionsInitial").value = 0;

    const startDate = document.querySelector("#startDate").value || getTodayISO();
    const continueFromDate = document.querySelector("#continueFromDate");

    if (continueFromDate._flatpickr) {
      continueFromDate._flatpickr.setDate(startDate);
    } else {
      continueFromDate.value = startDate;
    }
  }

  updateSessionSummary();
}

function updateSessionSummary() {
  const totalSessions = Number(document.querySelector("#totalSessions").value || 0);
  const alreadyStarted = document.querySelector("#alreadyStarted").checked;

  let usedSessionsInitial = alreadyStarted
    ? Number(document.querySelector("#usedSessionsInitial").value || 0)
    : 0;

  if (usedSessionsInitial < 0) usedSessionsInitial = 0;
  if (usedSessionsInitial > totalSessions) usedSessionsInitial = totalSessions;

  document.querySelector("#usedSessionsInitial").value = usedSessionsInitial;

  const sessionsToGenerate = Math.max(totalSessions - usedSessionsInitial, 0);

  document.querySelector("#summaryTotalSessions").textContent = totalSessions;
  document.querySelector("#summaryUsedSessions").textContent = usedSessionsInitial;
  document.querySelector("#summarySessionsToGenerate").textContent = sessionsToGenerate;
}

async function saveStudent(event) {
  event.preventDefault();

  const selectedDays = [...document.querySelectorAll("input[name='trainingDay']:checked")]
    .map((input) => input.value);

  if (selectedDays.length === 0) {
    alert("Selecciona al menos un día de entrenamiento.");
    return;
  }

  if (selectedDays.length > 5) {
  alert("Máximo 5 días por semana.");
  return;
}
  const firstName = document.querySelector("#firstName").value.trim();
  const lastName = document.querySelector("#lastName").value.trim();
  const phone = document.querySelector("#phone").value.trim();

  if (!firstName || !phone) {
    alert("Completa nombre y teléfono.");
    return;
  }

  const totalSessions = Number(document.querySelector("#totalSessions").value);
  const alreadyStarted = document.querySelector("#alreadyStarted").checked;

  let usedSessionsInitial = alreadyStarted
    ? Number(document.querySelector("#usedSessionsInitial").value || 0)
    : 0;

  if (usedSessionsInitial < 0) usedSessionsInitial = 0;

  if (usedSessionsInitial > totalSessions) {
    alert("Las sesiones usadas no pueden ser mayores al total del pack.");
    return;
  }

  const remainingSessions = Math.max(totalSessions - usedSessionsInitial, 0);

  if (remainingSessions === 0) {
    const confirmNoSessions = confirm(
      "Este estudiante ya no tiene sesiones restantes. Se guardará sin generar agenda. ¿Continuar?"
    );

    if (!confirmNoSessions) return;
  }

  const totalAmount = Number(document.querySelector("#totalAmount").value || 0);
  const paidAmount = Number(document.querySelector("#paidAmount").value || 0);

  let paymentStatus = PAYMENT_STATUS.PENDING;

  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PAID;
  } else if (paidAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIAL;
  }

  const startDateISO = document.querySelector("#startDate").value;
  const continueFromDateISO = document.querySelector("#continueFromDate").value || startDateISO;
  const scheduleStartDateISO = alreadyStarted ? continueFromDateISO : startDateISO;

  const defaultTime = document.querySelector("#defaultTime").value;
  const durationMinutes = Number(document.querySelector("#duration").value);

  const fullName = `${firstName} ${lastName}`.trim();

  const studentPayload = {
    firstName,
    lastName,
    fullName,
    phone,
    objective: document.querySelector("#objective").value,
    notes: document.querySelector("#notes").value.trim(),

    status: STUDENT_STATUS.ACTIVE,

    totalSessions,
    usedSessions: usedSessionsInitial,
    remainingSessions,

    alreadyStarted,
    scheduleGeneratedFrom: scheduleStartDateISO,

    scheduleDays: selectedDays,
    sessionDurationMinutes: durationMinutes,
    defaultTime,

    startDate: Timestamp.fromDate(new Date(`${startDateISO}T00:00:00`)),
    continueFromDate: Timestamp.fromDate(new Date(`${scheduleStartDateISO}T00:00:00`)),

    totalAmount,
    paidAmount,
    remainingAmount: Math.max(totalAmount - paidAmount, 0),
    paymentStatus,

    createdByEmail: session.profile.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const studentRef = await addDoc(collection(db, "students"), studentPayload);

  if (remainingSessions > 0) {
    const sessionDates = generateSessionDates({
      startDateISO: scheduleStartDateISO,
      selectedDays,
      totalSessions: remainingSessions
    });

    for (let i = 0; i < sessionDates.length; i++) {
      const dateISO = sessionDates[i];
      const startDateTime = combineDateTime(dateISO, defaultTime);
      const endDateTime = new Date(startDateTime);

      endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

      await addDoc(collection(db, "sessions"), {
        studentId: studentRef.id,
        studentName: fullName,

        sessionNumber: usedSessionsInitial + i + 1,
        packageSessionIndex: usedSessionsInitial + i + 1,

        dateISO,
        startTime: defaultTime,
        startAt: Timestamp.fromDate(startDateTime),
        endAt: Timestamp.fromDate(endDateTime),
        durationMinutes,

        status: SESSION_STATUS.SCHEDULED,
        countsAsUsed: false,

        generatedFromMigration: alreadyStarted,
        notes: "",

        createdByEmail: session.profile.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  if (paidAmount > 0) {
    await addDoc(collection(db, "payments"), {
      studentId: studentRef.id,
      studentName: fullName,
      amount: paidAmount,
      method: document.querySelector("#paymentMethod").value,
      note: alreadyStarted ? "Pago registrado en migración inicial" : "Pago inicial",
      createdByEmail: session.profile.email,
      createdAt: serverTimestamp()
    });
  }

  alert("Estudiante registrado correctamente.");
  window.location.href = "./estudiantes.html";
}
