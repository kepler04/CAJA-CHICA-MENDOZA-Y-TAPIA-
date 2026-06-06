import type { EstadoReembolso } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  ESTADO_REEMBOLSO_LABELS,
  ESTADO_REEMBOLSO_BADGE_CLASSES,
  ESTADO_REEMBOLSO_DOT_CLASSES,
} from "@/lib/reembolsos";

export function ReembolsoBadge({
  estado,
  className,
}: {
  estado: EstadoReembolso;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ESTADO_REEMBOLSO_BADGE_CLASSES[estado],
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          ESTADO_REEMBOLSO_DOT_CLASSES[estado]
        )}
      />
      {ESTADO_REEMBOLSO_LABELS[estado]}
    </span>
  );
}
