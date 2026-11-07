# Deploy de Jobilea en Vercel + Neon

## 1. Base de datos (Neon)
En Vercel: proyecto → **Storage → Create → Neon (Postgres)** y conectalo al proyecto.
La integración crea `DATABASE_URL` (con pooling) y `DATABASE_URL_UNPOOLED` (directa).
El build corre las migraciones con la conexión directa.

## 2. Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Valor |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` — no cambiarla nunca: cifra las API keys guardadas |
| `AUTH_TRUST_HOST` | `true` |
| `TZ` | tu zona, ej. `America/Montevideo` |

`DATABASE_URL` y `DATABASE_URL_UNPOOLED` las pone la integración de Neon.

## 3. Deploy
Importá `nicolaschacal/Jobilea` en Vercel (Framework: Next.js). Vercel usa el script
`vercel-build`: `prisma generate` → `prisma migrate deploy` → `next build`.

Registro en `/signup`, login en `/signin`.

## Limitaciones actuales en Vercel
- Los PDF de CV se guardan en `/tmp` (temporal). El texto extraído sí queda en la base.
  Pendiente: mover archivos a Vercel Blob.
- El programador interno de automatizaciones no corre en serverless.
  Pendiente: Vercel Cron llamando a un endpoint.
- Ollama local no está disponible: cada usuario usa su API key (OpenAI, Gemini, etc.).
