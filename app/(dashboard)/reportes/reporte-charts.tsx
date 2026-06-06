"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

import { formatPEN } from "@/lib/utils";
import type { TotalPorClave, PuntoLinea } from "@/app/actions/reportes";

const PALETA = [
  "#1e3a5f",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#6366f1",
  "#94a3b8",
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(214 25% 88%)",
  fontSize: 12,
};

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}

/** Barras: gastos por área. */
export function BarrasPorArea({ data }: { data: TotalPorClave[] }) {
  if (data.length === 0) return <EmptyChart msg="Sin datos por área" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="clave"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1" }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={(v) => [formatPEN(Number(v)), "Total"]}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(30,58,95,0.06)" }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut: distribución por categoría. */
export function DonutPorCategoria({ data }: { data: TotalPorClave[] }) {
  const total = data.reduce((a, d) => a + d.total, 0);
  if (total === 0) return <EmptyChart msg="Sin datos por categoría" />;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="clave"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETA[i % PALETA.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, _n, item) => [
                formatPEN(Number(v)),
                item?.payload?.clave as string,
              ]}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-display text-base font-semibold tabular-nums text-foreground">
            {formatPEN(total)}
          </span>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {data.map((d, i) => (
          <li key={d.clave} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PALETA[i % PALETA.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.clave}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatPEN(d.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Línea: evolución de gastos por día. */
export function LineaEvolucion({ data }: { data: PuntoLinea[] }) {
  if (data.length === 0) return <EmptyChart msg="Sin datos en el período" />;

  const fmtFecha = (f: string) =>
    new Date(f).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="fecha"
          tickFormatter={fmtFecha}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1" }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          labelFormatter={(l) => fmtFecha(String(l))}
          formatter={(v) => [formatPEN(Number(v)), "Total"]}
          contentStyle={tooltipStyle}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#1e3a5f"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#1e3a5f" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
