# Despliegue en Vercel — Caja Chica · Mendoza y Tapia S.A.C.

Guía paso a paso para llevar el sistema a producción en **Vercel** con
**Supabase** como base de datos, Auth y Storage.

---

## 0. Requisitos previos

- Cuenta de **GitHub** con el repositorio del proyecto subido.
- Cuenta de **Vercel** (free tier).
- Proyecto de **Supabase** ya creado (el mismo que usas en desarrollo, o
  uno nuevo para producción).
- Las migraciones de Prisma ya existen en `prisma/migrations/`.

> Si usas un proyecto Supabase distinto para producción, repite los pasos
> que crearon el bucket y habilitaron Realtime (ver §5 y §6).

---

## 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Sistema de Caja Chica - listo para producción"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/caja-chica-mendoza.git
git push -u origin main
```

> Verifica que `.env` **NO** se haya subido (está en `.gitignore`). Solo
> debe versionarse `.env.example`.

---

## 2. Crear el proyecto en Vercel

1. Entra a https://vercel.com/new
2. **Import Git Repository** → elige `caja-chica-mendoza`.
3. Framework preset: **Next.js** (se detecta solo).
4. Build Command: `npm run build` (ya incluye `prisma generate`).
5. **No** hagas deploy todavía: primero configura las variables (paso 3).

---

## 3. Variables de entorno en Vercel

En **Settings → Environment Variables**, agrega (entorno *Production* y
*Preview*):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Connection string **Transaction** (pooler, puerto 6543) + `?pgbouncer=true` |
| `DIRECT_URL` | Connection string **Session/Direct** (puerto 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La `anon`/`publishable` key |
| `SUPABASE_SERVICE_ROLE_KEY` | La `service_role` key (¡secreta!) |

> ⚠️ La contraseña dentro de las URLs debe ir **URL-encoded** si contiene
> caracteres especiales (ej. `@` → `%40`).
>
> ⚠️ **No** definas `NEXT_PUBLIC_DEMO_MODE` en producción (o ponlo en
> `false`), para que la autenticación real esté activa.

Luego pulsa **Deploy**.

---

## 4. Configurar Supabase Auth para el dominio de Vercel

En el panel de Supabase → **Authentication → URL Configuration**:

1. **Site URL**: `https://<tu-proyecto>.vercel.app`
2. **Redirect URLs**: agrega
   - `https://<tu-proyecto>.vercel.app/**`
   - (si usas dominio propio) `https://tudominio.com/**`

Esto permite que el login funcione desde el dominio de producción.

---

## 5. Migraciones de Prisma en producción

Las migraciones se aplican una sola vez contra la base de datos de
producción. Desde tu máquina, con el `.env` apuntando temporalmente a la
`DATABASE_URL`/`DIRECT_URL` de producción:

```bash
npx prisma migrate deploy
```

`migrate deploy` aplica las migraciones existentes sin crear nuevas (ideal
para producción). Luego, si quieres datos iniciales (fondo + usuarios):

```bash
npm run db:seed
```

> Alternativa: ejecuta estos comandos desde un entorno seguro. No subas la
> `.env` de producción al repositorio.

---

## 6. Verificar Supabase Storage y Realtime

1. **Storage**: panel → **Storage** → confirma que existe el bucket
   **`comprobantes`** y que es **público** (Settings del bucket → *Public*).
   - Si creaste un proyecto nuevo, vuelve a crearlo (ver el script usado en
     desarrollo o créalo manual: *New bucket → comprobantes → Public*,
     límite 5 MB, tipos `image/jpeg, image/png, application/pdf`).
2. **Realtime + RLS**: confirma que las tablas `Gasto`, `Fondo` y
   `Reembolso` tienen:
   - RLS habilitado con una policy `SELECT` para `authenticated`.
   - Están añadidas a la publicación `supabase_realtime`.
   - SQL de referencia (ejecútalo en **SQL Editor** si es proyecto nuevo):

   ```sql
   alter table "Gasto" enable row level security;
   create policy "gastos_select_authenticated" on "Gasto"
     for select to authenticated using (true);
   alter publication supabase_realtime add table "Gasto";

   alter table "Fondo" enable row level security;
   create policy "fondo_select_authenticated" on "Fondo"
     for select to authenticated using (true);
   alter publication supabase_realtime add table "Fondo";

   alter table "Reembolso" enable row level security;
   create policy "reembolso_select_authenticated" on "Reembolso"
     for select to authenticated using (true);
   alter publication supabase_realtime add table "Reembolso";
   ```

---

## 7. Crear las cuentas de acceso

El seed crea los **perfiles** (tabla `User` con su rol). Las **credenciales**
se crean en Supabase Auth con el mismo email:

- Panel → **Authentication → Users → Add user** (marca *Auto Confirm*).
- O desde la app: inicia sesión como `GERENTE_GENERAL` y usa
  **Usuarios → Nuevo usuario** (requiere `SUPABASE_SERVICE_ROLE_KEY`).

---

## 8. Checklist de pruebas antes de entregar

- [ ] `/login` carga y permite iniciar sesión con un usuario real.
- [ ] Tras login, redirige a `/dashboard` con el saldo correcto.
- [ ] El sidebar muestra los enlaces según el rol (Usuarios y Configuración
      solo para Gerente General).
- [ ] **Áreas**: crear, editar y desactivar funcionan (Gerente General).
- [ ] **Usuarios**: crear un usuario nuevo lo registra en Auth + BD.
- [ ] **Gastos**: el custodio registra un gasto; la validación de monto
      máximo bloquea montos por encima del límite; el comprobante se sube y
      se ve en el detalle.
- [ ] **Aprobaciones**: el flujo de 3 niveles avanza; rechazar pide motivo;
      la aprobación masiva funciona; el saldo baja al aprobar el final.
- [ ] **Reembolsos**: solicitar agrupa los gastos; al marcar *Reembolsado*
      el fondo se repone y aparece el toast.
- [ ] **Realtime**: el badge de aprobaciones y el saldo se actualizan sin
      recargar.
- [ ] **Reportes**: generar con filtros; exportar **Excel** (3 hojas) y
      **PDF** (encabezado, pie, paginación) descarga archivos correctos.
- [ ] **Historial 12 meses**: muestra el resumen y exporta a Excel; al
      hacer clic en un mes abre su reporte.
- [ ] **Configuración**: cambiar monto total / umbral / máximo se guarda y
      se refleja en el dashboard y en el formulario de gasto.
- [ ] La alerta naranja aparece cuando el saldo está bajo y hay pendiente
      de reembolso, y desaparece al reponer el fondo.
- [ ] Sin sesión, todas las rutas protegidas redirigen a `/login`.

---

## 9. Notas de mantenimiento

- **Rotar la `service_role` key** si alguna vez se expuso.
- Para nuevas migraciones: `npx prisma migrate dev` en local genera la
  migración; `npx prisma migrate deploy` la aplica en producción.
- El plan free de Supabase pausa proyectos inactivos; si el login falla
  tras inactividad, reactiva el proyecto desde el panel.
- El warning de build `process.version ... Edge Runtime` (del SDK de
  Supabase) es inofensivo y no afecta el funcionamiento.
