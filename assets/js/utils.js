// assets/js/utils.js

export function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN"
  }).format(number);
}

export function formatDate(dateValue) {
  if (!dateValue) return "-";

  let date;

  if (dateValue.toDate) {
    date = dateValue.toDate();
  } else {
    date = new Date(dateValue);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function generateLocalId(prefix = "ORD") {
  const now = Date.now();
  return `${prefix}-${now}`;
}

export function calculateItemsTotal(items = []) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    return sum + quantity * unitPrice;
  }, 0);
}
