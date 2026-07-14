// assets/js/utils.js

import { DAY_NUMBERS } from "./constants.js";

export function formatDate(dateValue) {
  if (!dateValue) return "-";

  let date;

  if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else {
    date = new Date(dateValue);
  }

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatShortDate(dateValue) {
  if (!dateValue) return "-";

  const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN"
  }).format(Number(value || 0));
}

export function toDateInputValue(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayISO() {
  return toDateInputValue(new Date());
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function combineDateTime(dateISO, time) {
  return new Date(`${dateISO}T${time || "00:00"}:00`);
}

export function generateSessionDates({ startDateISO, selectedDays, totalSessions }) {
  const result = [];
  let current = new Date(`${startDateISO}T00:00:00`);

  const dayNumbers = selectedDays.map((day) => DAY_NUMBERS[day]);

  while (result.length < totalSessions) {
    if (dayNumbers.includes(current.getDay())) {
      result.push(toDateInputValue(current));
    }

    current = addDays(current, 1);
  }

  return result;
}

export function getRemainingSessions(student) {
  return Number(student.totalSessions || 0) - Number(student.usedSessions || 0);
}

export function getPaymentLabel(status) {
  const labels = {
    paid: "Pagado",
    partial: "Parcial",
    pending: "Pendiente"
  };

  return labels[status] || "-";
}

export function getSessionLabel(status) {
  const labels = {
    scheduled: "Programada",
    attended: "Asistió",
    postponed: "Postergada",
    missed: "Falta",
    cancelled: "Cancelada"
  };

  return labels[status] || "-";
}
