import type { EstadoGasto } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  ESTADO_LABELS,
  ESTADO_BADGE_CLASSES,
  ESTADO_DOT_CLASSES,
} from "@/lib/gastos";

export function EstadoBadge({
  estado,
  className,
}: {
  estado: EstadoGasto;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ESTADO_BADGE_CLASSES[estado],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", ESTADO_DOT_CLASSES[estado])} />
      {ESTADO_LABELS[estado]}
    </span>
  );
}
