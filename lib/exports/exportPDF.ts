import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { ReporteData } from "@/app/actions/reportes";
import { ESTADO_LABELS } from "@/lib/gastos";

const AZUL: [number, number, number] = [30, 58, 95]; // #1e3a5f
const GRIS: [number, number, number] = [100, 116, 139];

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtFechaHora(d = new Date()) {
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function soles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function periodoTexto(data: ReporteData) {
  const { desde, hasta } = data.periodo;
  if (desde && hasta) return `${fmtFecha(desde)} — ${fmtFecha(hasta)}`;
  if (desde) return `Desde ${fmtFecha(desde)}`;
  if (hasta) return `Hasta ${fmtFecha(hasta)}`;
  return "Todo el histórico";
}

/**
 * Genera y descarga un PDF con encabezado en cada página, resumen
 * ejecutivo, tablas por área/categoría, detalle de gastos con salto de
 * página automático, paginación y pie de página.
 */
export function exportPDF(data: ReporteData, periodoSlug: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const generado = fmtFechaHora();
  const periodo = periodoTexto(data);

  // Encabezado y pie que se dibujan en cada página vía didDrawPage.
  const drawHeaderFooter = () => {
    // Encabezado
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, pageW, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MENDOZA Y TAPIA S.A.C.", 14, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Reporte de Caja Chica", 14, 17);
    doc.text(`Período: ${periodo}`, 14, 22);

    // Pie
    const pageH = doc.internal.pageSize.getHeight();
    doc.setTextColor(...GRIS);
    doc.setFontSize(8);
    doc.text(
      `Generado el ${generado} · Sistema de Caja Chica · Mendoza y Tapia S.A.C.`,
      14,
      pageH - 8
    );
  };

  let cursorY = 34;

  // ── Página 1: Resumen ejecutivo (cards en grilla simple)
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumen ejecutivo", 14, cursorY);
  cursorY += 6;

  const indicadores: [string, string][] = [
    ["Total de gastos", soles(data.resumen.total)],
    ["Nº de operaciones", String(data.resumen.operaciones)],
    ["Promedio por gasto", soles(data.resumen.promedio)],
    ["Gasto más alto", soles(data.resumen.masAlto)],
    ["Área con más gasto", data.resumen.areaTop],
    ["Categoría más usada", data.resumen.categoriaTop],
  ];

  const cardW = (pageW - 28 - 8) / 3;
  const cardH = 18;
  indicadores.forEach((ind, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * (cardW + 4);
    const y = cursorY + row * (cardH + 4);
    doc.setDrawColor(220, 225, 232);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setTextColor(...GRIS);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(ind[0].toUpperCase(), x + 3, y + 6);
    doc.setTextColor(...AZUL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(ind[1], x + 3, y + 13);
  });
  cursorY += 2 * (cardH + 4) + 4;

  // Tabla: gastos por área
  autoTable(doc, {
    startY: cursorY,
    head: [["Área", "Total"]],
    body: data.porArea.map((a) => [a.clave, soles(a.total)]),
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { top: 30, bottom: 14, left: 14, right: 14 },
    didDrawPage: drawHeaderFooter,
  });

  // Tabla: gastos por categoría
  autoTable(doc, {
    // @ts-expect-error lastAutoTable lo añade el plugin en runtime
    startY: (doc.lastAutoTable?.finalY ?? cursorY) + 6,
    head: [["Categoría", "Total"]],
    body: data.porCategoria.map((c) => [c.clave, soles(c.total)]),
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { top: 30, bottom: 14, left: 14, right: 14 },
    didDrawPage: drawHeaderFooter,
  });

  // ── Detalle de gastos (nueva página)
  doc.addPage();
  const totalDetalle = data.detalle.reduce((a, g) => a + g.monto, 0);
  autoTable(doc, {
    startY: 32,
    head: [
      [
        "Fecha",
        "Área",
        "Categoría",
        "Descripción",
        "Monto",
        "Comp.",
        "Estado",
        "Aprobado por",
      ],
    ],
    body: data.detalle.map((g) => [
      fmtFecha(g.fecha),
      g.area,
      g.categoriaLabel,
      g.descripcion,
      soles(g.monto),
      g.tieneComprobante ? "Sí" : "—",
      ESTADO_LABELS[g.estado],
      g.aprobadoPor,
    ]),
    foot: [
      ["", "", "", "TOTAL", soles(totalDetalle), "", "", ""],
    ],
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: AZUL, fontStyle: "bold" },
    columnStyles: {
      4: { halign: "right" },
      3: { cellWidth: 40 },
    },
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: "linebreak" },
    margin: { top: 30, bottom: 14, left: 14, right: 14 },
    didDrawPage: drawHeaderFooter,
  });

  // Numeración de páginas: "Página X de Y" (se hace al final cuando ya
  // conocemos el total de páginas).
  const totalPaginas = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setTextColor(...GRIS);
    doc.setFontSize(8);
    doc.text(
      `Página ${p} de ${totalPaginas}`,
      pageW - 14,
      pageH - 8,
      { align: "right" }
    );
  }

  doc.save(`CajaChica_MendozaTapia_${periodoSlug}.pdf`);
}
