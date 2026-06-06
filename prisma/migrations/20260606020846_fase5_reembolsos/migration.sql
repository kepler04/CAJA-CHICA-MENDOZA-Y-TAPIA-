-- CreateEnum
CREATE TYPE "EstadoReembolso" AS ENUM ('SOLICITADO', 'EN_REVISION', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "Reembolso" (
    "id" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoReembolso" NOT NULL DEFAULT 'SOLICITADO',
    "solicitadoPor" TEXT NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaReembolso" TIMESTAMP(3),
    "observacion" TEXT,

    CONSTRAINT "Reembolso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReembolsoGasto" (
    "id" TEXT NOT NULL,
    "reembolsoId" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,

    CONSTRAINT "ReembolsoGasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReembolsoGasto_gastoId_key" ON "ReembolsoGasto"("gastoId");

-- AddForeignKey
ALTER TABLE "Reembolso" ADD CONSTRAINT "Reembolso_solicitadoPor_fkey" FOREIGN KEY ("solicitadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReembolsoGasto" ADD CONSTRAINT "ReembolsoGasto_reembolsoId_fkey" FOREIGN KEY ("reembolsoId") REFERENCES "Reembolso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReembolsoGasto" ADD CONSTRAINT "ReembolsoGasto_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
