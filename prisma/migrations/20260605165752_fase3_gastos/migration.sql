-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('PAPELERIA', 'VIATICOS', 'MOVILIDAD', 'ENVIOS', 'PAGO_CARTAS', 'ARTICULOS_MENORES', 'SERVICIOS', 'OTROS');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('FACTURA', 'BOLETA_ELECTRONICA', 'TICKET', 'NOTA_VENTA', 'PLANILLA_MOVILIDAD');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PENDIENTE', 'APROBADO_N1', 'APROBADO_N2', 'APROBADO_FINAL', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "areaId" TEXT NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL,
    "numeroComprobante" TEXT,
    "comprobanteUrl" TEXT,
    "estado" "EstadoGasto" NOT NULL DEFAULT 'PENDIENTE',
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aprobacion" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "aprobadoPor" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aprobacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprobacion" ADD CONSTRAINT "Aprobacion_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
