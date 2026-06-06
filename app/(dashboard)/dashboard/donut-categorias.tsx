"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { formatPEN } from "@/lib/utils";

export type DonutDato = {
  categoria: string;
  label: string;
  total: number;
  color: string;
};

export function DonutCategorias({ data }: { data: DonutDato[] }) {
  const total = data.reduce((acc, d) => acc + d.total, 0);

  if (total === 0) {
    return (
      <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Sin datos</p>
          <p className="text-xs text-muted-foreground">
            No hay gastos aprobados este mes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.categoria} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                formatPEN(Number(value)),
                item?.payload?.label as string,
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(214 25% 88%)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Total al centro */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total mes</span>
          <span className="font-display text-lg font-semibold tabular-nums text-foreground">
            {formatPEN(total)}
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <ul className="grid flex-1 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.categoria} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.label}
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
