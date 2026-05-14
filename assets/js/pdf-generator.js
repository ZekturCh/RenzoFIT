// assets/js/pdf-generator.js

import { formatCurrency } from "./utils.js";

export async function generateQuotePDF({ workOrder, client, bike }) {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Cotización", 20, 25);

  // Logo
  // Luego cambia la ruta si tu logo tiene otro nombre.
  const logo = await loadImageAsBase64("./assets/img/logo-tesen.png");
  doc.addImage(logo, "PNG", 20, 35, 55, 22);

  // Datos empresa
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Tesen Factory", 20, 62);

  doc.setFont("helvetica", "normal");
  doc.text("Av. San Hilarion Este 333 - San Juan de Lurigancho", 20, 68);

  // Fecha y número
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 135, 40);
  doc.text("Quote No.:", 135, 47);

  doc.setFont("helvetica", "normal");
  doc.text(formatDateForPDF(workOrder.quoteDate || new Date()), 160, 40);
  doc.text(String(workOrder.quoteNumber || workOrder.code || "-"), 160, 47);

  // Facturar a
  doc.setFont("helvetica", "bold");
  doc.text("Facturar a", 20, 84);

  doc.setFont("helvetica", "normal");
  doc.text("Cliente", 20, 90);
  doc.text(`${client.firstName || ""} ${client.lastName || ""}`.trim(), 20, 96);

  if (bike?.plate) {
    doc.text(bike.plate, 20, 102);
  }

  // Tabla
  const tableBody = (workOrder.items || []).map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const total = quantity * unitPrice;

    return [
      quantity,
      item.name || "-",
      formatCurrency(unitPrice),
      formatCurrency(total)
    ];
  });

  doc.autoTable({
    startY: 112,
    head: [["Cant.", "Descripción", "Precio unitario", "Total"]],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 20 },
      1: { cellWidth: 105 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 }
    },
    margin: { left: 20, right: 20 }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", pageWidth - 60, finalY);
  doc.text(formatCurrency(workOrder.total || 0), pageWidth - 35, finalY, {
    align: "right"
  });

  // Mensaje final
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gracias por su preferencia", 20, 275);

  doc.save(`Cotizacion-${workOrder.quoteNumber || workOrder.code || "Tesen"}.pdf`);
}

function formatDateForPDF(value) {
  let date;

  if (value?.toDate) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  return date.toISOString().split("T")[0];
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
    img.src = url;
  });
}
