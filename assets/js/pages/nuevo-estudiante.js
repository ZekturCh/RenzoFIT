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
  document.querySelector("#startDate").value = getTodayISO();

  document.querySelectorAll(".quick-days button").forEach((button) => {
    button.addEventListener("click", () => {
      const days = button.dataset.days.split(",");
      document.querySelectorAll("input[name='trainingDay']").forEach((checkbox) => {
        checkbox.checked = days.includes(checkbox.value);
      });
    });
  });

  document.querySelector("#studentForm").addEventListener("submit", saveStudent);
}

async function saveStudent(event) {
  event.preventDefault();

  const selectedDays = [...document.querySelectorAll("input[name='trainingDay']:checked")]
    .map((input) => input.value);

  if (selectedDays.length === 0) {
    alert("Selecciona al menos un día de entrenamiento.");
    return;
  }

  if (selectedDays.length > 4) {
    alert("Máximo 4 días por semana.");
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
  const totalAmount = Number(document.querySelector("#totalAmount").value || 0);
  const paidAmount = Number(document.querySelector("#paidAmount").value || 0);

  let paymentStatus = PAYMENT_STATUS.PENDING;

  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PAID;
  } else if (paidAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIAL;
  }

  const startDateISO = document.querySelector("#startDate").value;
  const defaultTime = document.querySelector("#defaultTime").value;
  const durationMinutes = Number(document.querySelector("#duration").value);

  const studentPayload = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    phone,
    objective: document.querySelector("#objective").value,
    notes: document.querySelector("#notes").value.trim(),

    status: STUDENT_STATUS.ACTIVE,

    totalSessions,
    usedSessions: 0,
    remainingSessions: totalSessions,

    scheduleDays: selectedDays,
    sessionDurationMinutes: durationMinutes,
    defaultTime,
    startDate: Timestamp.fromDate(new Date(`${startDateISO}T00:00:00`)),

    totalAmount,
    paidAmount,
    remainingAmount: Math.max(totalAmount - paidAmount, 0),
    paymentStatus,

    createdByEmail: session.profile.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const studentRef = await addDoc(collection(db, "students"), studentPayload);

  const sessionDates = generateSessionDates({
    startDateISO,
    selectedDays,
    totalSessions
  });

  for (let i = 0; i < sessionDates.length; i++) {
    const dateISO = sessionDates[i];
    const startDateTime = combineDateTime(dateISO, defaultTime);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    await addDoc(collection(db, "sessions"), {
      studentId: studentRef.id,
      studentName: studentPayload.fullName,
      sessionNumber: i + 1,
      dateISO,
      startTime: defaultTime,
      startAt: Timestamp.fromDate(startDateTime),
      endAt: Timestamp.fromDate(endDateTime),
      durationMinutes,
      status: SESSION_STATUS.SCHEDULED,
      countsAsUsed: false,
      notes: "",
      createdByEmail: session.profile.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  if (paidAmount > 0) {
    await addDoc(collection(db, "payments"), {
      studentId: studentRef.id,
      studentName: studentPayload.fullName,
      amount: paidAmount,
      method: document.querySelector("#paymentMethod").value,
      note: "Pago inicial",
      createdByEmail: session.profile.email,
      createdAt: serverTimestamp()
    });
  }

  alert("Estudiante registrado y sesiones generadas.");
  window.location.href = "./estudiantes.html";
}
