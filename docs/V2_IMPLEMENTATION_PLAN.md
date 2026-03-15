# InboxChat v2 — Plan de Implementación (Retention Features)

**Objetivo:** Hacer que los operadores quieran abrir el inbox todos los días.

**Features en scope:**
1. Typing Indicators
2. Conversation Assignment
3. Conversation Search
4. Canned Responses

---

## Orden de implementación recomendado

```
1. Typing Indicators   → impacto visual inmediato, bajo riesgo
2. Canned Responses    → impacto en productividad, sin cambios de DB complejos
3. Conversation Assignment → requiere migración de DB
4. Conversation Search → requiere índice de DB + nuevo endpoint
```

---

## Feature 1: Typing Indicators

**Qué hace:** El operador ve "el visitante está escribiendo..." en tiempo real. El visitante ve "soporte está escribiendo..."

### Cambios necesarios

#### [MODIFY] `packages/shared/src/types/socket.ts`
Agregar dos eventos en `ClientToServerEvents` y dos en `ServerToClientEvents`:

```typescript
// ClientToServerEvents — el widget y el dashboard emiten esto
"typing:start": (payload: { conversationId: string }) => void;
"typing:stop": (payload: { conversationId: string }) => void;

// ServerToClientEvents — el servidor retransmite a la sala
"typing:update": (payload: { conversationId: string; isTyping: boolean; sender: "contact" | "operator" }) => void;
```

#### [MODIFY] `apps/server/src/socket/handlers.ts`
Agregar dos handlers con **debounce server-side** (auto-clear a los 5s si no llega `typing:stop`):

```typescript
const typingTimers = new Map<string, NodeJS.Timeout>();

socket.on("typing:start", ({ conversationId }) => {
  // Retransmitir a la sala (excluye al sender)
  const sender = socket.data.isOperator ? "operator" : "contact";
  socket.to(`conversation:${conversationId}`)
    .emit("typing:update", { conversationId, isTyping: true, sender });

  // Auto-clear: si el cliente se cae sin enviar typing:stop
  clearTimeout(typingTimers.get(conversationId));
  typingTimers.set(conversationId, setTimeout(() => {
    socket.to(`conversation:${conversationId}`)
      .emit("typing:update", { conversationId, isTyping: false, sender });
  }, 5000));
});

socket.on("typing:stop", ({ conversationId }) => {
  clearTimeout(typingTimers.get(conversationId));
  typingTimers.delete(conversationId);
  const sender = socket.data.isOperator ? "operator" : "contact";
  socket.to(`conversation:${conversationId}`)
    .emit("typing:update", { conversationId, isTyping: false, sender });
});
```

#### [MODIFY] `apps/web/src/hooks/use-socket.ts`
Agregar listener `typing:update` → actualizar un estado local de "quién está escribiendo" por conversación.

#### [MODIFY] `apps/web/src/components/chat-panel.tsx`
- En el textarea: emitir `typing:start` al primer keystroke, `typing:stop` al dejar de escribir (debounce 1.5s)
- Mostrar el indicador animado ("..." pulsante) cuando el contacto está escribiendo

**Sin cambios de DB.** Entirely in-memory vía Socket.io.

---

## Feature 2: Canned Responses

**Qué hace:** El operador escribe `/` en el input y aparece un selector con respuestas predefinidas. Acelera el tiempo de respuesta 3-5x.

### Cambios de DB

#### [NEW] `apps/server/src/db/migrations/007_canned_responses.sql`
```sql
CREATE TABLE IF NOT EXISTS canned_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shortcut     TEXT NOT NULL,   -- ej: "hola", "precio", "demo"
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_canned_workspace ON canned_responses(workspace_id);
```

### Cambios de backend

#### [NEW] `apps/server/src/routes/canned-responses.routes.ts`
```
GET  /api/canned-responses          → listar todas del workspace
POST /api/canned-responses          → crear nueva (body: { shortcut, body })
PUT  /api/canned-responses/:id      → editar
DELETE /api/canned-responses/:id    → eliminar
```

#### [MODIFY] `apps/server/src/index.ts`
Registrar `cannedResponsesRoutes`.

### Cambios de frontend

#### [MODIFY] `apps/web/src/components/chat-panel.tsx`
- Detectar `"/"` al inicio del input → mostrar dropdown con las canned responses filtradas
- Filtrar mientras el operador escribe (ej: `/hol` muestra "hola")
- Click o Enter en el item → reemplaza el texto del input completo
- Escape → cierra el dropdown

#### [NEW] `apps/web/src/app/settings/page.tsx` (sección de Canned Responses)
Panel en Settings para gestionar el catálogo de respuestas. CRUD completo.

---

## Feature 3: Conversation Assignment

**Qué hace:** El operador puede asignar una conversación a un miembro específico del equipo. Solo mostrás las conversaciones asignadas a vos (o las sin asignar).

### Cambios de DB

#### [NEW] `apps/server/src/db/migrations/008_conversation_assignment.sql`
```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES operators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
```

### Cambios de domain types

#### [MODIFY] `packages/shared/src/types/domain.ts`
```typescript
interface Conversation {
  // ... existente ...
  assignedTo: string | null;  // operator ID
}
```

#### [MODIFY] `packages/shared/src/types/socket.ts`
Agregar en `ServerToClientEvents`:
```typescript
"conversation:assigned": (payload: { conversationId: string; operatorId: string | null }) => void;
```

### Cambios de backend

#### [MODIFY] `apps/server/src/routes/dashboard.routes.ts`
```
POST /api/conversations/:id/assign
Body: { operatorId: string | null }   // null = desasignar
```
Después del UPDATE: emitir `conversation:assigned` vía ioRef.

#### [MODIFY] `apps/server/src/db/queries.ts`
- `listConversations`: incluir `assigned_to` en el SELECT y el JSON
- Nueva query: `assignConversation(db, conversationId, operatorId)`

### Cambios de frontend

#### [MODIFY] `apps/web/src/components/chat-panel.tsx`
Dropdown en el header del chat para seleccionar el operador asignado. Muestra el avatar del asignado.

#### [MODIFY] `apps/web/src/components/conversation-list.tsx`
Nuevo filtro: "Mías" / "Sin asignar" / "Todas" (además de Abiertas/Cerradas).

#### [MODIFY] `apps/web/src/hooks/use-socket.ts`
Listener para `conversation:assigned` → `updateConversation` en el store.

---

## Feature 4: Conversation Search

**Qué hace:** Barra de búsqueda en el sidebar que filtra por nombre de contacto, email, o contenido de mensajes.

### Cambios de DB

#### [NEW] `apps/server/src/db/migrations/009_search_index.sql`
```sql
-- Full-text search index en mensajes (PostgreSQL native)
CREATE INDEX IF NOT EXISTS idx_messages_fts
  ON messages USING gin(to_tsvector('spanish', body));

-- Index en contactos para búsqueda por nombre/email
CREATE INDEX IF NOT EXISTS idx_contacts_name_email
  ON contacts(workspace_id, lower(name), lower(email));
```

### Cambios de backend

#### [MODIFY] `apps/server/src/routes/dashboard.routes.ts`
```
GET /api/conversations/search?q=texto

Lógica:
1. Buscar contactos cuyo name o email hace ILIKE '%q%'
2. Buscar mensajes que hacen match con to_tsquery('spanish', q)
3. Retornar las conversaciones únicas que matchean cualquiera de los dos
LIMIT 20, ordenadas por relevancia
```

### Cambios de frontend

#### [MODIFY] `apps/web/src/components/conversation-list.tsx`
- Input de búsqueda en el header del sidebar (debounce 300ms)
- Cuando hay búsqueda activa: ocultar los tabs open/closed, mostrar resultados
- Limpiar búsqueda con Escape o `×`

---

## Archivos impactados — resumen

| Archivo | Features |
|---|---|
| `packages/shared/src/types/socket.ts` | Typing, Assignment |
| `packages/shared/src/types/domain.ts` | Assignment |
| `apps/server/src/socket/handlers.ts` | Typing |
| `apps/server/src/routes/dashboard.routes.ts` | Assignment, Search |
| `apps/server/src/routes/canned-responses.routes.ts` | Canned (NEW) |
| `apps/server/src/db/queries.ts` | Assignment, Search |
| `apps/server/src/index.ts` | Canned |
| `apps/server/src/db/migrations/007_*.sql` | Canned (NEW) |
| `apps/server/src/db/migrations/008_*.sql` | Assignment (NEW) |
| `apps/server/src/db/migrations/009_*.sql` | Search (NEW) |
| `apps/web/src/hooks/use-socket.ts` | Typing, Assignment |
| `apps/web/src/components/chat-panel.tsx` | Typing, Canned, Assignment |
| `apps/web/src/components/conversation-list.tsx` | Assignment, Search |
| `apps/web/src/app/settings/page.tsx` | Canned (sección nueva) |

---

## Verificación

### Typing Indicators
1. Abrir widget en /demo.html
2. Abrir dashboard en /inbox
3. Escribir en el widget → ver "el visitante está escribiendo..." en el dashboard
4. Dejar de escribir 1.5s → indicador desaparece
5. El operador escribe → el widget muestra "soporte está escribiendo..."

### Canned Responses
1. En Settings → crear canned response: shortcut="hola", body="Hola! ¿En qué te puedo ayudar?"
2. En una conversación, escribir `/hola` en el input
3. Verificar que aparece el dropdown con la respuesta
4. Seleccionar → el input se llena con el texto completo

### Conversation Assignment
1. Con 2 operadores en el mismo workspace
2. Abrir una conversación → asignar al Operador 2
3. El Operador 2 (en otra pestaña) ve la conversación marcada como "asignada a mí"
4. Filtrar por "Mías" → solo aparecen las asignadas

### Conversation Search
1. En el sidebar, escribir el nombre de un contacto
2. Los resultados aparecen sin recargar
3. Escribir parte de un mensaje → aparecen las conversaciones que contienen ese texto

---

## Notas de implementación

> [!IMPORTANT]
> Las 3 migraciones de DB (007, 008, 009) deben correrse en Supabase SQL Editor
> **antes** de deployar el servidor. El orden importa.

> [!TIP]
> Empezar por Typing Indicators: es el feature de mayor impacto visual con el
> menor riesgo técnico — sin DB, sin migraciones, puro Socket.io.
