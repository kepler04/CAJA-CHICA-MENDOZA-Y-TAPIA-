# Caja Chica · Mendoza y Tapia S.A.C.

Sistema de gestión de Caja Chica. **Fase 1**: autenticación, control de
acceso por rol, layout con sidebar y estructura base de datos.

## Stack

- **Next.js 14** (App Router) · React 18 · TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Prisma 6** (ORM)
- **Tailwind CSS 3** + **shadcn/ui**
- Deploy: **Vercel** (free tier)

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y completa los valores desde tu proyecto de
Supabase (panel → Settings):

| Variable | Dónde encontrarla |
| --- | --- |
| `DATABASE_URL` | Settings → Database → Connection string → **Transaction** (pooler, puerto 6543). Añade `?pgbouncer=true`. |
| `DIRECT_URL` | Settings → Database → Connection string → **Session/Direct** (puerto 5432). La usa Prisma para migraciones y seed. |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → `anon` `public` key |

> ⚠️ El archivo `.env` está ignorado por git. Nunca lo subas al repositorio.

### 3. Crear el esquema en la base de datos

```bash
# Primera vez (crea las tablas y la primera migración)
npm run db:migrate

# O, si prefieres empujar el esquema sin historial de migraciones:
npm run db:push
```

### 4. Cargar datos de prueba (seed)

```bash
npm run db:seed
```

Esto crea el **fondo inicial** (S/ 1000, umbral S/ 200) y los **perfiles**
de 4 usuarios, uno por rol:

| Email | Rol |
| --- | --- |
| `nicool@mendozaytapia.com` | CUSTODIO |
| `admin@mendozaytapia.com` | GERENTE_ADMIN |
| `contable@mendozaytapia.com` | GERENTE_CONTABLE |
| `dalena@mendozaytapia.com` | GERENTE_GENERAL |

### 5. Crear las cuentas de autenticación en Supabase

> **Importante:** el seed crea los *perfiles* (nombre + rol) en la tabla
> `User`, pero **no** las credenciales. La autenticación la gestiona
> **Supabase Auth**, que es un sistema aparte.

Para cada usuario, crea su cuenta en Supabase con el **mismo email**:

- Panel de Supabase → **Authentication → Users → Add user**
- Marca "Auto Confirm User" para que pueda iniciar sesión de inmediato.
- Asigna una contraseña.

Al iniciar sesión, la app empareja la sesión de Supabase con el perfil de
la tabla `User` por email y obtiene el rol (`lib/auth.ts`).

### 6. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre http://localhost:3000 → redirige a `/login`. Tras autenticarte,
entras al `/dashboard` con el sidebar.

## Scripts

| Script | Acción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`prisma generate` + `next build`) |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Crear/aplicar migraciones de Prisma |
| `npm run db:push` | Sincronizar esquema sin migraciones |
| `npm run db:seed` | Cargar datos de prueba |
| `npm run db:studio` | Prisma Studio (explorador visual de la BD) |

## Estructura

```
app/
  (auth)/login/        → pantalla de login (pública)
  (dashboard)/         → rutas protegidas con sidebar
    dashboard/
components/
  sidebar.tsx          → navegación lateral por rol
  logout-button.tsx
  ui/                  → componentes shadcn/ui
lib/
  prisma.ts            → cliente Prisma (singleton)
  auth.ts              → getSessionUser (server-only)
  roles.ts             → ROLE_LABELS y tipos (cliente + servidor)
  supabase/
    client.ts          → cliente browser
    server.ts          → cliente server (Server Components)
    middleware.ts      → refresco de sesión + reglas de acceso
middleware.ts          → protege /dashboard, /areas, /gastos, …
prisma/
  schema.prisma        → User, Fondo, Area, enum Role
  seed.ts              → 4 usuarios + fondo inicial
```

## Roles

| Rol | Acceso especial |
| --- | --- |
| `CUSTODIO` | Operativo |
| `GERENTE_ADMIN` | Administración |
| `GERENTE_CONTABLE` | Contabilidad |
| `GERENTE_GENERAL` | Todo, incluye la sección **Usuarios** |

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Añade las 4 variables de entorno en **Settings → Environment Variables**.
3. El build (`prisma generate && next build`) corre automáticamente.
4. Ejecuta `db:migrate` y `db:seed` contra la BD de producción una sola vez
   (desde local apuntando a la `DATABASE_URL`/`DIRECT_URL` de producción).
