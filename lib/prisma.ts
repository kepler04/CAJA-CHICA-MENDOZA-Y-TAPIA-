import { PrismaClient } from "@prisma/client";

// Singleton de Prisma. En desarrollo, Next.js recarga los módulos en caliente
// y crearía una nueva instancia en cada cambio, agotando el pool de conexiones.
// Cacheamos la instancia en el objeto global para reutilizarla.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
