# InboxChat — Runbook de Operaciones

## Stack en producción

| Componente | URL | Servicio |
|---|---|---|
| Servidor Fastify + Socket.io | `https://inboxchatserver-production.up.railway.app` | Railway |
| Dashboard Next.js | `https://inboxchat-kby8olemm-gellik98-gmailcoms-projects.vercel.app` | Vercel |
| Base de datos | Supabase — proyecto `miinnoomcxlecytzfbnw` | Supabase |
| Widget demo | `https://inboxchatserver-production.up.railway.app/demo.html` | Railway |

---

## Cuando hacés cambios en el código

### Cambios en el servidor (`apps/server/`)

```bash
cd "/Users/gerardovalpuesta/mis desarrollor/Saas/inboxchat"

git add -A
git commit -m "feat/fix: descripción del cambio"
git push

# Railway redeploya automáticamente en ~40s
# Healthcheck: /health
```

### Cambios en el dashboard (`apps/web/`)

```bash
git add -A
git commit -m "feat/fix: descripción del cambio"
git push
# Vercel redeploya automáticamente en ~2min
```

---

## Variables de entorno

### Railway (servidor)

| Variable | Descripción | Status |
|---|---|---|
| `DATABASE_URL` | URL del Session Pooler de Supabase | ✅ configurada |
| `WEB_URL` | URL del dashboard de Vercel | ✅ configurada |
| `RESEND_API_KEY` | Clave de API de Resend para emails | ✅ configurada |
| `EMAIL_FROM` | Remitente (formato `Nombre <email>`) | ✅ configurada |
| `JWT_SECRET` | 64 chars random — NO modificar en producción | ✅ configurada |
| `NODE_ENV` | `production` | ✅ configurada |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe | ✅ configurada |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de Stripe | ⚠️ **PENDIENTE** |

### Vercel (dashboard)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | URL del servidor Railway |

> **IMPORTANTE:** Variables `NEXT_PUBLIC_*` se embeben en el build.
> Si las cambiás, hacé **Redeploy manual** en Vercel.

---

## Configurar Stripe Webhook (PENDIENTE)

1. Ir a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint** → URL: `https://inboxchatserver-production.up.railway.app/api/billing/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiar el **Signing secret** (empieza con `whsec_`)
5. En Railway → Variables → agregar `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
6. Railway redeploya automáticamente

---

## Migraciones de base de datos

Los archivos SQL están en `apps/server/src/db/migrations/`.
Para correrlas: **SQL Editor de Supabase** → pegar el contenido del archivo.

| Migración | Descripción | Status |
|---|---|---|
| `schema.sql` | Tablas base (workspaces, contacts, conversations, messages) | ✅ aplicada |
| `seed.sql` | Workspace de dev `api_key: dev_key_inboxchat_local` | ✅ aplicada |
| `001_add_operators.sql` | Tabla operators para auth | ✅ aplicada |
| `007_canned_responses.sql` | Tabla canned_responses (shortcuts) | ✅ aplicada |
| `008_conversation_assignment.sql` | Columna assigned_to en conversations | ✅ aplicada |
| `009_search_index.sql` | Índice FTS para búsqueda de conversaciones | ✅ aplicada |

---

## Features implementados

### v2 — Retention
- ✅ Typing indicators (operador ↔ visitante)
- ✅ Canned responses (`/shortcut` en el input)
- ✅ Asignación de conversaciones a operadores
- ✅ Búsqueda de conversaciones (FTS)

### v3 — Growth
- ✅ PLG Badge "Powered by InboxChat" (free tier)
- ✅ Trial Banner con urgencia
- ✅ Onboarding Checklist (3 pasos)
- ✅ Stripe Billing Loop (checkout → pro → email confirmación)

### Backlog
- ✅ Filtros de asignación (Todas / Mías / Sin asignar)
- ✅ Browser push notifications (cuando operador no tiene foco)
- ✅ Notas internas (privadas, no llegan al widget)
- ✅ Analytics renovado (range picker 7/14/30d, top operadores, pico horario)
- ✅ Contact detail panel (perfil + historial de conversaciones)

---

## Agregar un nuevo operador

1. Ir a `https://<url-vercel>/register`
2. Completar: nombre, email, password (mín. 8 chars), Workspace Key
3. La Workspace Key de producción se obtiene de Settings en el dashboard

---

## Probar el flujo completo en producción

1. Abrir `https://inboxchatserver-production.up.railway.app/demo.html` — widget del visitante
2. Abrir `https://<url-vercel>/inbox` — dashboard del operador
3. En el widget: abrir chat → completar prechat → enviar un mensaje
4. En el dashboard: aparece la conversación en el sidebar
5. Responder desde el dashboard → el mensaje llega en tiempo real
6. Probar notas internas: click en 🔒 antes de enviar — no aparece en el widget

---

## Comandos útiles de desarrollo local

```bash
# Arrancar servidor (modo dev con hot reload)
pnpm --filter @inboxchat/server dev

# Arrancar dashboard (modo dev)
pnpm --filter @inboxchat/web dev

# Type-check de todo el monorepo
pnpm --filter @inboxchat/server type-check
pnpm --filter @inboxchat/web type-check

# Verificar que el servidor de producción está corriendo
curl https://inboxchatserver-production.up.railway.app/health
```

---

## Si el servidor en Railway no responde

```bash
# Ver logs en tiempo real
railway logs --service "@inboxchat/server"

# Redeploy manual desde local
railway up --service "@inboxchat/server"

# Railway panel → servicio @inboxchat/server → Settings → Networking
```
