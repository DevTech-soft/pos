# Despliegue: Supabase + Railway + Vercel

Guía paso a paso para poner en producción **Pool Manager**:

- **Supabase** → base de datos PostgreSQL.
- **Railway** → backend (NestJS API en `backend/`).
- **Vercel** → frontend (Next.js en `frontend/`).

Los tres servicios se conectan por variables de entorno — no hay networking
especial que configurar, solo URLs y CORS.

```
[Vercel: Next.js] ──HTTPS──▶ [Railway: NestJS API] ──TCP/SSL──▶ [Supabase: Postgres]
   NEXT_PUBLIC_API_URL           DATABASE_URL / DIRECT_URL
                                 FRONTEND_URL (CORS)
```

---

## 0. Prerrequisitos

- Cuentas creadas en [supabase.com](https://supabase.com), [railway.app](https://railway.app) y [vercel.com](https://vercel.com).
- El repo debe estar en GitHub (Railway y Vercel despliegan por integración con Git).
- Este es un **monorepo**: `backend/` y `frontend/` son proyectos independientes.
  Tanto en Railway como en Vercel vas a configurar el **Root Directory** de cada uno.

> Ya apliqué un fix necesario para que esto funcione: agregué
> `"postinstall": "prisma generate"` a `backend/package.json`. Sin esto, Railway
> instala dependencias pero nunca genera el cliente de Prisma y el build falla
> en producción (en local no se nota porque ya lo tienes generado).

---

## 1. Supabase — base de datos

### 1.1 Crear el proyecto

1. En Supabase, **New project** → elige org, nombre (`pool-manager`), password de la
   base de datos (guárdala, la vas a necesitar) y la región **más cercana a donde
   esté Railway** (ej. si Railway queda en US East, usa una región US en Supabase
   para reducir latencia).
2. Espera a que aprovisione (~2 min).

### 1.2 Obtener las dos connection strings

El `schema.prisma` de este proyecto ya está preparado para el modo recomendado
de Prisma con Supabase (pooler + conexión directa):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — la usa la app en runtime
  directUrl = env("DIRECT_URL")     // directa — la usa `prisma migrate`
}
```

En Supabase: **Project Settings → Database → Connection string**.

| Variable | Qué tomar en Supabase | Puerto | Uso |
|---|---|---|---|
| `DATABASE_URL` | pestaña **Transaction** (pooler / PgBouncer) | `6543` | Queries normales de la app (Railway) |
| `DIRECT_URL` | pestaña **Session** (pooler) | `5432` | Migraciones (`prisma migrate deploy`) |

> ⚠️ **No uses la pestaña "Direct connection"** (host `db.<ref>.supabase.co`)
> para `DIRECT_URL`. Esa conexión es **solo IPv6** salvo que pagues el add-on
> de IPv4 en Supabase — si tu red no tiene salida IPv6 funcional, el `SYN` se
> pierde en silencio y `prisma migrate deploy` se queda colgado
> indefinidamente sin ningún error (ver Troubleshooting). Usa siempre la
> pestaña **Session pooler**: mismo host que el de `DATABASE_URL`
> (`...pooler.supabase.com`), solo cambia el puerto a `5432`.

Copia el URI, reemplaza `[YOUR-PASSWORD]` por la password que definiste, y
**agrega `?pgbouncer=true` al final del `DATABASE_URL`** (obligatorio para que
Prisma funcione bien contra el pooler de Supabase):

```env
DATABASE_URL="postgresql://postgres.xxxxxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

(El host y el proyecto-id exactos los copias tal cual te los da Supabase — el
de arriba es solo el formato. Nota que ambas variables usan el **mismo host**
del pooler, solo cambia el puerto.)

### 1.3 Aplicar las migraciones de Prisma

Desde tu máquina local, apuntando temporalmente a Supabase, corre las
migraciones que ya existen en `backend/prisma/migrations/`:

```bash
cd backend
# No sobrescribas tu .env local: exporta las vars solo para este comando
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true" \
DIRECT_URL="postgresql://...pooler...:5432/postgres" \
npx prisma migrate deploy
```

En PowerShell:

```powershell
$env:DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://...pooler...:5432/postgres"
npx prisma migrate deploy
```

Esto crea todas las tablas (incluyendo `rentals`, `rental_spaces`,
`rental_items` del último módulo) en Supabase. Verifícalo en
**Supabase → Table Editor**.

### 1.4 (Opcional) Seed inicial

El seed (`backend/prisma/seed.ts`) crea un superadmin y un tenant demo con
**passwords hardcodeadas** (`superadmin123`, `admin123`). Solo córrelo en
producción si sabes que vas a cambiar esas contraseñas de inmediato:

```bash
DATABASE_URL="..." DIRECT_URL="..." npx prisma db seed
```

Si prefieres arrancar limpio, sáltate este paso y crea el primer usuario
manualmente (vía Supabase SQL editor o un endpoint admin) una vez el backend
esté arriba.

---

## 2. Railway — backend (NestJS)

### 2.1 Crear el servicio

1. Railway → **New Project → Deploy from GitHub repo** → selecciona este repo.
2. Como es un monorepo, entra a **Settings** del servicio recién creado y en
   **Source → Root Directory** pon `backend`.
3. Railway detecta Node automáticamente (Nixpacks) y usará `npm install` +
   lo que definas como start command.

### 2.2 Build & Start command

En **Settings → Deploy**:

- **Build Command**: dejar el default de Nixpacks (`npm run build`) — como
  agregamos `postinstall`, `prisma generate` corre solo durante `npm install`.
- **Start Command** (override): tiene que aplicar migraciones nuevas antes de
  levantar el server en cada deploy:

  ```bash
  npx prisma migrate deploy && npm run start:prod
  ```

  Esto reemplaza el uso de `npm run env:prod` (ese script es solo para tu
  máquina local — en Railway las env vars ya están inyectadas en
  `process.env`, no dependen de un archivo `.env`).

### 2.3 Variables de entorno

**Settings → Variables**, agrega:

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | el pooled de Supabase (`:6543` + `?pgbouncer=true`) | mismo del paso 1.2 |
| `DIRECT_URL` | el directo de Supabase (`:5432`) | mismo del paso 1.2 |
| `JWT_SECRET` | un secreto largo y aleatorio | **no reutilices** el de `.env.local`. Genera uno con `openssl rand -base64 48` |
| `FRONTEND_URL` | `https://tu-app.vercel.app` | se usa para CORS en `main.ts`; actualízalo cuando tengas la URL final de Vercel (paso 3) |
| `NODE_ENV` | `production` | |
| `PORT` | *(no la definas)* | Railway inyecta su propio `PORT`; el código ya lo lee de `process.env.PORT` |
| `REDIS_URL` | *(opcional)* | ver 2.4 |

> El código de `redis.service.ts` ya está hecho a prueba de fallos: si Redis
> no está disponible, loguea un warning y la app sigue funcionando sin caché.
> No es obligatorio para que el sistema arranque.

### 2.4 (Opcional) Redis en Railway

Si quieres caché real: Railway → **+ New → Database → Add Redis** dentro del
mismo proyecto. Railway te da una `REDIS_URL` (con `rediss://` si tiene TLS) —
cópiala como variable `REDIS_URL` del servicio backend. El código ya soporta
`REDIS_URL` directamente (ver `redis.service.ts:19`).

### 2.5 Dominio

**Settings → Networking → Generate Domain** te da algo como
`pool-manager-backend-production.up.railway.app`. Ese es tu
`NEXT_PUBLIC_API_URL` (con `/api` al final) para el paso siguiente.

Deploy y revisa los logs: deberías ver
`🏊 Pool Manager API running on http://localhost:<PORT>/api`.

---

## 3. Vercel — frontend (Next.js)

### 3.1 Importar el proyecto

1. Vercel → **Add New → Project** → importa el mismo repo de GitHub.
2. En **Configure Project**:
   - **Root Directory**: `frontend` (botón "Edit" al lado del campo).
   - Framework Preset: Vercel detecta **Next.js** automáticamente.
   - Build/Output/Install command: dejar los defaults de Next.js.

### 3.2 Variables de entorno

**Settings → Environment Variables** (o en el modal de import):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<tu-dominio-railway>.up.railway.app/api` |

Agrégala para los tres entornos (**Production**, **Preview**, **Development**)
si quieres que los preview deployments también apunten al backend de
producción. Como es `NEXT_PUBLIC_*`, queda embebida en el bundle del cliente
en build time — si la cambias, tienes que **redeploy**, no basta con guardar
la variable.

### 3.3 Deploy

Deploy. Vercel te da un dominio como `pool-manager.vercel.app`.

---

## 4. Cerrar el círculo (CORS)

El backend valida CORS contra `FRONTEND_URL` (`main.ts:9-12`), un solo
origen. Ahora que tienes la URL final de Vercel:

1. Railway → variable `FRONTEND_URL` → pon `https://pool-manager.vercel.app`
   (sin slash final).
2. Railway redeploya solo al guardar la variable.
3. Prueba login desde la URL de Vercel — si ves un error de CORS en la consola
   del navegador, confirma que `FRONTEND_URL` en Railway coincide **exacto**
   (protocolo + host, sin `/` al final) con la URL desde la que estás
   navegando.

> Si usas dominios de preview de Vercel (`*-git-branch-user.vercel.app`) para
> QA, ese origen **no** va a pasar CORS porque `FRONTEND_URL` solo admite un
> valor. Para soportar varios orígenes habría que cambiar `enableCors` en
> `main.ts` a una función que valide contra una lista/regex — no lo hice
> porque no lo pediste, avísame si lo necesitas.

---

## 5. Checklist final

- [ ] Supabase: tablas creadas (`prisma migrate deploy` corrió sin errores).
- [ ] Railway: deploy verde, logs muestran el server arrancado.
- [ ] Railway: `GET https://<tu-backend>.up.railway.app/api` responde (aunque
      sea 404 de una ruta no definida — confirma que el proceso está vivo).
- [ ] Vercel: build verde, `NEXT_PUBLIC_API_URL` apunta al dominio de Railway.
- [ ] Login desde la URL de Vercel funciona (confirma DB + CORS + JWT al
      mismo tiempo).
- [ ] `JWT_SECRET` en Railway es distinto al de desarrollo.
- [ ] Contraseñas del seed (si lo corriste) ya fueron cambiadas.

## Troubleshooting rápido

| Síntoma | Causa probable |
|---|---|
| Railway build falla en `nest build` con error de tipos de Prisma | Falta `postinstall` (ya debería estar) o el Build Command no corre `npm install` primero |
| `P1001: Can't reach database server` | `DATABASE_URL`/`DIRECT_URL` mal copiadas, o falta `?pgbouncer=true` en la pooled |
| `prisma migrate deploy` se queda colgado tras "Datasource db: ..." sin error ni progreso | `DIRECT_URL` apunta a la pestaña **Direct connection** (`db.<ref>.supabase.co`, solo IPv6) en vez de **Session pooler** (`...pooler.supabase.com:5432`). Cambia `DIRECT_URL` al host del pooler con puerto 5432 |
| `Error: prisma:error ... prepared statement already exists` | Falta `?pgbouncer=true` en `DATABASE_URL` (el pooler de Supabase no soporta prepared statements sin ese flag) |
| CORS bloqueado en el navegador | `FRONTEND_URL` en Railway no coincide con el origen exacto de Vercel |
| Frontend pega a `localhost:3001` en producción | `NEXT_PUBLIC_API_URL` no seteada en Vercel, o no hiciste redeploy después de cambiarla |
| 401 inmediato tras login | `JWT_SECRET` cambió entre deploys (invalida tokens viejos) — normal, solo requiere volver a loguear |
