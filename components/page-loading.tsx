import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto de carga reutilizable para páginas con tabla. Se muestra de
 * inmediato al navegar (vía loading.tsx) mientras el servidor carga los
 * datos, de modo que la navegación se siente instantánea.
 */
export function PageLoading({
  withFilters = false,
  rows = 6,
  cols = 5,
}: {
  withFilters?: boolean;
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Filtros opcionales */}
      {withFilters && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-4 w-20" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: withFilters ? 5 : 0 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}
