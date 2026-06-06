"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Role } from "@prisma/client";

import { createClient } from "@/lib/supabase/client";

/** Estado de gasto que cada rol tiene pendiente de revisar (nivel de origen). */
const ESTADO_PENDIENTE_POR_ROL: Partial<Record<Role, string>> = {
  GERENTE_ADMIN: "PENDIENTE",
  GERENTE_CONTABLE: "APROBADO_N1",
  GERENTE_GENERAL: "APROBADO_N2",
};

type GastoRow = {
  id: string;
  estado: string;
  monto: number;
  areaId: string;
};

export type NuevoPendiente = {
  id: string;
  monto: number;
  areaId: string;
  areaNombre?: string;
};

type Options = {
  /** Count inicial (renderizado en el servidor) para evitar parpadeos. */
  initialCount?: number;
  /**
   * Se llama cuando un gasto entra al estado que este rol debe revisar
   * (gasto nuevo PENDIENTE, o uno que avanzó al nivel del usuario).
   */
  onNuevoPendiente?: (gasto: NuevoPendiente) => void;
};

/**
 * Se suscribe en tiempo real a la tabla Gasto vía Supabase Realtime
 * (postgres_changes) y mantiene el número de gastos pendientes para el
 * rol indicado. No requiere recargar la página.
 *
 * Devuelve el count en vivo. Para roles que no aprueban (CUSTODIO),
 * el count es siempre 0 y no se crea ninguna suscripción.
 */
export function useAprobacionesPendientes(
  role: Role,
  { initialCount = 0, onNuevoPendiente }: Options = {}
) {
  const [count, setCount] = useState(initialCount);
  const estadoObjetivo = ESTADO_PENDIENTE_POR_ROL[role];
  // Nombre de canal único por instancia (evita colisiones de Supabase).
  const instanceId = useId();

  // Guardamos el callback en un ref para no recrear la suscripción.
  const onNuevoRef = useRef(onNuevoPendiente);
  useEffect(() => {
    onNuevoRef.current = onNuevoPendiente;
  }, [onNuevoPendiente]);

  // Mantener sincronizado si cambia el count inicial (navegación).
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!estadoObjetivo) {
      setCount(0);
      return;
    }

    const supabase = createClient();

    async function refetch() {
      const { count: c } = await supabase
        .from("Gasto")
        .select("id", { count: "exact", head: true })
        .eq("estado", estadoObjetivo);
      if (typeof c === "number") setCount(c);
    }

    // Resuelve el nombre del área (lookup puntual, solo al notificar).
    async function notificar(nuevo: GastoRow) {
      let areaNombre: string | undefined;
      const { data } = await supabase
        .from("Area")
        .select("nombre")
        .eq("id", nuevo.areaId)
        .maybeSingle();
      if (data?.nombre) areaNombre = data.nombre as string;
      onNuevoRef.current?.({
        id: nuevo.id,
        monto: nuevo.monto,
        areaId: nuevo.areaId,
        areaNombre,
      });
    }

    // Carga inicial fiable desde la BD.
    refetch();

    const channel = supabase
      .channel(`aprobaciones-${role}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Gasto" },
        (payload) => {
          const nuevo = payload.new as GastoRow;
          if (nuevo.estado === estadoObjetivo) notificar(nuevo);
          refetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Gasto" },
        (payload) => {
          const nuevo = payload.new as GastoRow;
          const viejo = payload.old as Partial<GastoRow>;
          // Avanzó al nivel de este usuario → notificar.
          if (
            nuevo.estado === estadoObjetivo &&
            viejo.estado !== estadoObjetivo
          ) {
            notificar(nuevo);
          }
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, estadoObjetivo, instanceId]);

  return count;
}
