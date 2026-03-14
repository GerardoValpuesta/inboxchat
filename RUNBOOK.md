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

# Commitear los cambios
git add -A
git commit -m "feat/fix: descripción del cambio"
git push

# Deployar en Railway (bypasea el scanner de vulnerabilidades)
railway up --service "@inboxchat/server"
```

Railway tarda ~40 segundos en buildear y deployar. El healthcheck en `/health` confirma que está corriendo.

### Cambios en el dashboard (`apps/web/`)

```bash
# Commitear y pushear — Vercel redeploya automáticamente al detectar el push
git add -A
git commit -m "feat/fix: descripción del cambio"
git push
```

Vercel detecta el push a `main` y hace redeploy automático en ~2 minutos.

---

## Variables de entorno

### Railway (servidor)

Configuradas en el panel de Railway → servicio `@inboxchat/server` → Variables:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL del Session Pooler de Supabase |
| `WEB_URL` | URL del dashboard de Vercel |
| `RESEND_API_KEY` | Clave de API de Resend para emails |
| `EMAIL_FROM` | Remitente de emails (formato `Nombre <email>`) |
| `JWT_SECRET` | 64 chars random — NO modificar en producción |
| `NODE_ENV` | `production` |

### Vercel (dashboard)

Configuradas en panel de Vercel → proyecto `inboxchat-web` → Settings → Environment Variables:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SERVER_URL` | URL del servidor Railway. Si cambia la URL de Railway, hay que actualizar esta var Y hacer redeploy en Vercel |

> **IMPORTANTE:** Las variables `NEXT_PUBLIC_*` se embeben en el build de Next.js.
> Si las cambiás en Vercel, hay que hacer un Redeploy manual para que tomen efecto.

---

## Agregar un nuevo operador al workspace

1. Ir a `https://<url-vercel>/register`
2. Completar: nombre, email, password (mín. 8 chars), Workspace Key
3. La Workspace Key de desarrollo es: `dev_key_inboxchat_local`

---

## Probar el flujo completo en producción

1. Abrir `https://inboxchatserver-production.up.railway.app/demo.html` — widget del visitor
2. Abrir `https://<url-vercel>/inbox` — dashboard del operador
3. En el widget: hacer click en el botón de chat → escribir un mensaje → Enter
4. En el dashboard: debería aparecer la conversación nueva en el sidebar
5. Responder desde el dashboard → el mensaje llega al widget en tiempo real

---

## Comandos útiles de desarrollo local

```bash
# Arrancar el servidor (modo dev con hot reload)
pnpm --filter @inboxchat/server dev

# Arrancar el dashboard (modo dev)
pnpm --filter @inboxchat/web dev

# Type-check de todo el monorepo
pnpm --filter @inboxchat/server type-check
pnpm --filter @inboxchat/web type-check

# Verificar que el servidor de producción está corriendo
curl https://inboxchatserver-production.up.railway.app/health
```

---

## Migraciones de base de datos

Los archivos SQL están en `apps/server/src/db/migrations/`.  
Para correrlas: ir al **SQL Editor de Supabase** y pegar el contenido del archivo.

Migraciones aplicadas:
- `schema.sql` — tablas base (workspaces, contacts, conversations, messages)
- `seed.sql` — workspace de dev con `api_key: dev_key_inboxchat_local`
- `001_add_operators.sql` — tabla operators para auth

---

## Si el servidor en Railway no responde

```bash
# Ver qué URL tiene el servicio
# Railway panel → servicio @inboxchat/server → Settings → Networking

# Redeploy manual desde local
railway up --service "@inboxchat/server"

# Ver logs en tiempo real
railway logs --service "@inboxchat/server"
```
