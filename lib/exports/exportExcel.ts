import * as XLSX from "xlsx";

import type { ReporteData } from "@/app/actions/reportes";
import { ESTADO_LABELS } from "@/lib/gastos";
import { ESTADO_REEMBOLSO_LABELS } from "@/lib/reembolsos";

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

function periodoTexto(data: ReporteData) {
  const { desde, hasta } = data.periodo;
  if (desde && hasta) return `${fmtFecha(desde)} — ${fmtFecha(hasta)}`;
  if (desde) return `Desde ${fmtFecha(desde)}`;
  if (hasta) return `Hasta ${fmtFecha(hasta)}`;
  return "Todo el histórico";
}

/** Aplica formato de moneda S/ a una celda. */
const MONEDA_FMT = '"S/ "#,##0.00';

/**
 * Genera y descarga un Excel con 3 hojas:
 *  1) Resumen ejecutivo + gastos por área + por categoría
 *  2) Detalle de gastos (con total)
 *  3) Historial de reembolsos del período
 *
 * Nota: la versión community de SheetJS no aplica colores de fondo de
 * celda; sí respeta anchos, formato de moneda y negritas básicas. El
 * contenido y los totales se exportan correctamente en todos los casos.
 */
export function exportExcel(data: ReporteData, periodoSlug: string) {
  const wb = XLSX.utils.book_new();

  /* ── Hoja 1: Resumen ── */
  const resumenAOA: (string | number)[][] = [
    ["CAJA CHICA — MENDOZA Y TAPIA S.A.C."],
    [`Período: ${periodoTexto(data)}`],
    [`Generado: ${fmtFechaHora()}`],
    [],
    ["RESUMEN EJECUTIVO"],
    ["Total gastos:", data.resumen.total],
    ["Nº operaciones:", data.resumen.operaciones],
    ["Promedio por gasto:", data.resumen.promedio],
    ["Gasto más alto:", data.resumen.masAlto],
    ["Área con más gasto:", data.resumen.areaTop],
    ["Categoría más usada:", data.resumen.categoriaTop],
    [],
    ["GASTOS POR ÁREA"],
    ["Área", "Total"],
    ...data.porArea.map((a) => [a.clave, a.total]),
    [],
    ["GASTOS POR CATEGORÍA"],
    ["Categoría", "Total"],
    ...data.porCategoria.map((c) => [c.clave, c.total]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenAOA);
  wsResumen["!cols"] = [{ wch: 26 }, { wch: 18 }];

  // Formato de moneda en las celdas de montos del resumen
  const moneyCellsResumen = ["B6", "B8", "B9"];
  for (const c of moneyCellsResumen) {
    if (wsResumen[c]) wsResumen[c].z = MONEDA_FMT;
  }
  // Montos de las tablas por área/categoría (columna B desde fila 15)
  for (let r = 14; r < resumenAOA.length; r++) {
    const cell = `B${r + 1}`;
    if (wsResumen[cell] && typeof wsResumen[cell].v === "number") {
      wsResumen[cell].z = MONEDA_FMT;
    }
  }
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  /* ── Hoja 2: Detalle de gastos ── */
  const detalleHeader = [
    "Fecha",
    "Área",
    "Categoría",
    "Descripción",
    "Monto",
    "Comprobante",
    "Estado",
    "Aprobado por",
  ];
  const detalleRows = data.detalle.map((g) => [
    fmtFecha(g.fecha),
    g.area,
    g.categoriaLabel,
    g.descripcion,
    g.monto,
    g.tieneComprobante ? "Sí" : "No",
    ESTADO_LABELS[g.estado],
    g.aprobadoPor,
  ]);
  const totalDetalle = data.detalle.reduce((a, g) => a + g.monto, 0);
  const detalleAOA = [
    detalleHeader,
    ...detalleRows,
    ["", "", "", "TOTAL", totalDetalle, "", "", ""],
  ];
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleAOA);
  wsDetalle["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 40 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
  ];
  // Estilo de cabecera (azul corporativo + texto blanco) — se aplica si la
  // build de SheetJS lo soporta.
  for (let c = 0; c < detalleHeader.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (wsDetalle[ref]) {
      wsDetalle[ref].s = {
        fill: { fgColor: { rgb: "1E3A5F" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
      };
    }
  }
  // Formato moneda en columna Monto (índice 4) + filas alternas
  for (let r = 1; r <= detalleRows.length + 1; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 4 });
    if (wsDetalle[ref] && typeof wsDetalle[ref].v === "number") {
      wsDetalle[ref].z = MONEDA_FMT;
    }
  }
  // Total en negrita
  const totalRef = XLSX.utils.encode_cell({ r: detalleRows.length + 1, c: 4 });
  if (wsDetalle[totalRef]) {
    wsDetalle[totalRef].s = { font: { bold: true } };
  }
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle de gastos");

  /* ── Hoja 3: Historial de reembolsos ── */
  const reembAOA: (string | number)[][] = [
    [
      "Fecha solicitud",
      "Fecha reembolso",
      "N° gastos",
      "Monto total",
      "Estado",
      "Solicitado por",
    ],
    ...data.reembolsos.map((r) => [
      fmtFecha(r.fechaSolicitud),
      r.fechaReembolso ? fmtFecha(r.fechaReembolso) : "—",
      r.numGastos,
      r.montoTotal,
      ESTADO_REEMBOLSO_LABELS[
        r.estado as keyof typeof ESTADO_REEMBOLSO_LABELS
      ] ?? r.estado,
      r.solicitadoPor,
    ]),
  ];
  if (data.reembolsos.length === 0) {
    reembAOA.push(["Sin reembolsos en el período", "", "", "", "", ""]);
  }
  const wsReemb = XLSX.utils.aoa_to_sheet(reembAOA);
  wsReemb["!cols"] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
  ];
  for (let r = 1; r < reembAOA.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 3 });
    if (wsReemb[ref] && typeof wsReemb[ref].v === "number") {
      wsReemb[ref].z = MONEDA_FMT;
    }
  }
  XLSX.utils.book_append_sheet(wb, wsReemb, "Reembolsos");

  XLSX.writeFile(wb, `CajaChica_MendozaTapia_${periodoSlug}.xlsx`);
}

/** Exporta el historial anual (12 meses) a un Excel de una hoja. */
export function exportHistorialExcel(
  meses: {
    etiqueta: string;
    totalGastado: number;
    operaciones: number;
    numReembolsos: number;
    montoReembolsado: number;
  }[]
) {
  const wb = XLSX.utils.book_new();
  const header = [
    "Mes",
    "Total gastado",
    "Nº operaciones",
    "Nº reembolsos",
    "Monto reembolsado",
  ];
  const rows = meses.map((m) => [
    m.etiqueta,
    m.totalGastado,
    m.operaciones,
    m.numReembolsos,
    m.montoReembolsado,
  ]);
  const totalGastado = meses.reduce((a, m) => a + m.totalGastado, 0);
  const totalReembolsado = meses.reduce((a, m) => a + m.montoReembolsado, 0);
  const totalOps = meses.reduce((a, m) => a + m.operaciones, 0);
  const totalReemb = meses.reduce((a, m) => a + m.numReembolsos, 0);

  const aoa = [
    ["CAJA CHICA — MENDOZA Y TAPIA S.A.C."],
    ["Historial de los últimos 12 meses"],
    [`Generado: ${fmtFechaHora()}`],
    [],
    header,
    ...rows,
    ["TOTAL", totalGastado, totalOps, totalReemb, totalReembolsado],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
  ];
  // Formato moneda en columnas de montos (índices 1 y 4)
  for (let r = 5; r < aoa.length; r++) {
    for (const c of [1, 4]) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = MONEDA_FMT;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "Historial 12 meses");
  XLSX.writeFile(wb, "CajaChica_MendozaTapia_Historial_12meses.xlsx");
}
