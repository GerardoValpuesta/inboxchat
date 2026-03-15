# InboxChat — Auditoría Técnica & Producto

## ✅ Lo que ya funciona

| Área | Estado |
|---|---|
| Auth (login/register/JWT) | ✅ |
| Password reset via Resend | ✅ |
| Socket.io tiempo real (chat widget ↔ dashboard) | ✅ |
| Notificación email cuando operador offline | ✅ |
| Billing con Stripe (checkout + portal) | ✅ |
| Trial enforcement (14 días, límite 100 convs) | ✅ |
| Analytics básicos (totals, by-day, avg response time) | ✅ |
| Multi-operadores (tabla operators) | ✅ |
| Widget config (welcome message, GDPR) | ✅ |
| Rate limiting + helmet + CORS | ✅ |
| Deploy Railway (server) + Vercel (web) | ✅ |
| Favicon + Apple touch icon | ✅ |

---

## 🔴 Crítico (bloquea producción real)

### 1. No hay `conversation:close` implementado
- La conversación se crea y tiene `status: 'open' | 'closed'` en el schema.
- **Pero NO existe** el evento Socket.io ni el endpoint REST para cerrar una conversación.
- El operador no puede marcar una conversación como resuelta. Están todas abiertas para siempre.

### 2. Sin paginación en conversaciones
- `listConversations` hardcodea `LIMIT 50`. Con más tráfico, no se pueden cargar más.
- No hay cursor/offset en el endpoint REST ni en el frontend.

### 3. El widget no está compilado como paquete independiente
- `packages/widget/src/` existe pero no tiene `package.json` ni build script.
- `widget.js` se sirve como archivo estático en `apps/server/public/` pero no está claro si está actualizado con el código fuente de `packages/widget/`.

### 4. Sin validación de `stripe_subscription_status` en producción
- El schema tiene `stripe_subscription_status` en `billing.routes.ts` pero **no existe en `schema.sql`** (la columna no está creada en la migración base).
- Si el webhook de Stripe falla, un usuario con suscripción cancelada puede seguir accediendo.

### 5. Sin `services/` folder (está vacío)
- La estructura tiene `apps/server/src/services/` pero está **vacía**.
- La lógica de negocio está mezclada dentro de los route handlers → viola SRP.

---

## 🟡 Importante para un SaaS real

### 6. Sin typing indicators
- El widget no emite `typing:start` / `typing:stop`.
- El operador no ve si el visitante está escribiendo (feature básico en cualquier live chat).

### 7. Sin soporte para adjuntos / imágenes
- Solo texto. No hay S3/Upload para archivos.

### 8. Sin SSE/push notifications para el dashboard
- El operador recibe mensajes en tiempo real solo si tiene el tab abierto (Socket.io activo).
- Si cierra el tab, se pierde en socket pero el email funciona. Falta Web Push Notifications (service worker).

### 9. Sin búsqueda de conversaciones
- No hay endpoint de búsqueda por contacto, email, o contenido de mensajes.

### 10. Sin asignación de operadores
- Múltiples operadores pueden ver el inbox pero no hay "asignar conversación a operador X".
- Todos ven todo, sin ownership. Quilombo operativo a partir de 2+ agentes.

### 11. Analytics incompletos
- Solo hay 1 endpoint GET `/api/analytics` con métricas básicas.
- No hay CSAT (Customer Satisfaction), tiempo de resolución por operador, ni exportación de datos.

### 12. Sin rate limit específico para `message:send`
- El global de 200 req/min aplica para HTTP, pero **Socket.io no pasa por `@fastify/rate-limit`**.
- Un visitante puede mandar spam de mensajes sin restricción a nivel Socket.

---

## 🟢 Deuda técnica menor

### 13. `resolveWorkspaceId` duplicado
- La función `resolveWorkspaceId` está copiada en `billing.routes.ts`, `dashboard.routes.ts` y probablemente `analytics.routes.ts`.
- Debería estar en `apps/server/src/lib/auth.ts`.

### 14. Sin tests de integración para routes críticos
- Billing (checkout/portal), auth, y socket handlers no tienen tests automatizados.
- (Hubo trabajo de coverage en convos pasadas pero revisar si llega a estos módulos.)

### 15. Sin ORM / migration tool formal
- Las migraciones son SQL manual corridas en Supabase. Sin versionado automático.
- Riesgo de desync entre el schema actual y los archivos `.sql`.

### 16. `stripe_subscription_status` falta en schema
- Como mencionado en críticos, la columna existe en el código TypeScript pero no en `schema.sql`.

---

## Prioridad sugerida

```
P0 (ahora): conversation:close, stripe_subscription_status migration
P1 (próximo sprint): paginación, typing indicators, rate limit en socket
P2 (post-launch): asignación de operadores, búsqueda, Web Push
P3 (deuda técnica): refactor resolveWorkspaceId, ORM migrations, tests
```
