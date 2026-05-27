# Proposal: Phase 3 — Advanced Features

## Intent
Extender la plataforma con 4 capacidades avanzadas sobre la base de WhatsApp ya integrada: Media CDN, Chatbot/Automation, Team Inbox multi-agente, y Webhooks salientes.

## Scope

### In Scope
- **Media CDN**: Descarga persistente de media de WhatsApp → MinIO/S3, thumbnails, URLs firmadas
- **Chatbot / Automation Rules**: Motor de reglas condicionales con auto-respuesta, integración con IA vía webhook
- **Team Inbox**: Asignación de conversaciones a agentes, estados, notas internas, vistas por equipo
- **Outgoing Webhooks**: Eventos salientes vía HTTP a sistemas externos (CRM, etc.)

### Out of Scope
- API pública documentada
- Dashboard de analytics
- Chatbot con IA nativa (solo hook para IA externa)
- Auto-scaling de WebSocket (Redis adapter)

---

## Architecture Overview

### New Modules in `apps/api/src/modules/`

```
modules/
├── media/
│   ├── media.module.ts
│   ├── controllers/media.controller.ts
│   ├── services/
│   │   ├── media-storage.service.ts      # MinIO/S3 abstraction
│   │   ├── media-downloader.service.ts   # Download from WhatsApp
│   │   └── media-thumbnail.service.ts    # Thumbnail generation
│   └── entities/
│       └── media.entity.ts
│
├── chatbot/
│   ├── chatbot.module.ts
│   ├── controllers/rule.controller.ts
│   ├── services/
│   │   ├── rule-engine.service.ts        # Condition matching
│   │   ├── auto-reply.service.ts         # Execute auto-replies
│   │   └── ai-hook.service.ts            # External AI integration
│   └── entities/
│       └── automation-rule.entity.ts
│
├── inbox/
│   ├── inbox.module.ts
│   ├── controllers/inbox.controller.ts
│   ├── services/
│   │   ├── assignment.service.ts         # Assign/reassign conversations
│   │   ├── conversation-state.service.ts # Open/closed/pending
│   │   └── internal-notes.service.ts     # Notes on conversations
│   └── (extends existing Conversation entity)
│
└── webhooks/
    ├── webhooks.module.ts
    ├── controllers/webhook-config.controller.ts
    ├── services/
    │   ├── webhook-delivery.service.ts   # HTTP delivery + retry
    │   ├── webhook-event-bus.service.ts  # Event subscription
    │   └── webhook-signature.service.ts  # HMAC signing
    └── entities/
        └── webhook-config.entity.ts
```

### Database Changes

```sql
-- Media CDN
CREATE TABLE media (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,       -- FK to messages
    session_id VARCHAR(36) NOT NULL,       -- FK to sessions
    original_url VARCHAR(500),             -- Original WhatsApp URL
    storage_key VARCHAR(500) NOT NULL,     -- S3/MinIO key
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    thumbnail_key VARCHAR(500),            -- Thumbnail key
    width INT, height INT,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Chatbot Rules
CREATE TABLE automation_rules (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    conditions JSON NOT NULL,              -- [{field, operator, value}]
    actions JSON NOT NULL,                 -- [{type, config}]
    priority INT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Team Inbox (extend conversations)
ALTER TABLE conversations ADD COLUMN assigned_to VARCHAR(36);  -- FK to users
ALTER TABLE conversations ADD COLUMN status ENUM('OPEN','PENDING','CLOSED') DEFAULT 'OPEN';

CREATE TABLE conversation_notes (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Webhooks
CREATE TABLE webhook_configs (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL,                  -- ['message.received','message.sent','conversation.assigned']
    is_active BOOLEAN DEFAULT true,
    secret VARCHAR(100),                   -- HMAC secret
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

---

## Super-Agentes, Micro-Agentes, Nano-Agentes

### SA-1: Media CDN (Complejidad: 4/5)

| Micro | Archivos | Acción | Depende de |
|---|---|---|---|
| **SA1-M1 — Storage Abstraction** |
| SA1-N1 | `services/media-storage.service.ts` | Crear — Interfaz S3/MinIO, upload, download, delete, signed URLs | — |
| SA1-N2 | `apps/api/package.json` | Agregar `@aws-sdk/client-s3` | — |
| **SA1-M2 — Media Downloader** |
| SA1-N3 | `services/media-downloader.service.ts` | Crear — Intercepta mensajes con media, descarga de WhatsApp, sube a storage | SA1-M1 |
| SA1-N4 | Modificar `message-handler.service.ts` | Hookear media download en `processMessage` | SA1-N3 |
| **SA1-M3 — Thumbnails** |
| SA1-N5 | `services/media-thumbnail.service.ts` | Crear — Generar thumbnails de imágenes, videos | SA1-M1 |
| **SA1-M4 — API + Frontend** |
| SA1-N6 | `controllers/media.controller.ts` | Crear — GET /media/:id (serve signed URL) | SA1-M1 |
| SA1-N7 | `entities/media.entity.ts` | Crear — media table entity | — |
| SA1-N8 | `media.module.ts` | Crear — Module definition | SA1-N6, SA1-N7 |
| SA1-N9 | Frontend: `media-preview.tsx` | Modificar — Usar storage URLs en lugar de WhatsApp URLs | SA1-N6 |

### SA-2: Chatbot / Automation (Complejidad: 4/5)

| Micro | Archivos | Acción | Depende de |
|---|---|---|---|
| **SA2-M1 — Rule Entity + CRUD** |
| SA2-N1 | `entities/automation-rule.entity.ts` | Crear — Rule entity con JSON fields | — |
| SA2-N2 | `controllers/rule.controller.ts` | Crear — CRUD de reglas | SA2-N1 |
| SA2-N3 | `dto/create-rule.dto.ts` + `update-rule.dto.ts` | Crear — Input validation | — |
| **SA2-M2 — Rule Engine** |
| SA2-N4 | `services/rule-engine.service.ts` | Crear — Match conditions, evalúa keywords/regex/sender | SA2-N1 |
| SA2-N5 | `services/auto-reply.service.ts` | Crear — Ejecuta acciones (send text, media, webhook) | SA2-N4 |
| SA2-N6 | Modificar `message-handler.service.ts` | Hookear rule engine en mensajes entrantes | SA2-N4 |
| **SA2-M3 — AI Hook** |
| SA2-N7 | `services/ai-hook.service.ts` | Crear — Enviar mensaje a URL externa, usar respuesta | — |
| **SA2-M4 — Frontend Rules UI** |
| SA2-N8 | `app/(dashboard)/automation/page.tsx` | Crear — Lista de reglas | SA2-N2 |
| SA2-N9 | `components/automation/rule-card.tsx` | Crear — Card de regla individual | — |
| SA2-N10 | `components/automation/rule-form.tsx` | Crear — Formulario de reglas con condition builder | — |

### SA-3: Team Inbox (Complejidad: 3/5)

| Micro | Archivos | Acción | Depende de |
|---|---|---|---|
| **SA3-M1 — Conversation Extensions** |
| SA3-N1 | Migración ALTER TABLE conversations | Crear — assigned_to, status columns | — |
| SA3-N2 | Modificar `entities/conversation.entity.ts` | Agregar assigned_to, status, user relation | — |
| SA3-N3 | `entities/conversation-note.entity.ts` | Crear — Internal notes entity | — |
| **SA3-M2 — Assignment Service** |
| SA3-N4 | `services/assignment.service.ts` | Crear — Asignar/reasignar, listar agentes disponibles | SA3-N1 |
| SA3-N5 | `controllers/inbox.controller.ts` | Crear — GET /inbox, POST assign, PATCH status | SA3-N4 |
| SA3-N6 | `services/internal-notes.service.ts` | Crear — CRUD de notas internas | SA3-N3 |
| **SA3-M3 — Frontend Inbox** |
| SA3-N7 | Modificar `chat-sidebar.tsx` | Agregar filtros: mis conversaciones, no asignadas, cerradas | — |
| SA3-N8 | Modificar `chat-header.tsx` | Agregar botón asignar, selector de estado | SA3-N4 |
| SA3-N9 | `components/inbox/notes-panel.tsx` | Crear — Panel lateral de notas | SA3-N6 |
| SA3-N10 | Modificar `chat-store.ts` | Agregar assigned_to, status, notes al store | — |

### SA-4: Outgoing Webhooks (Complejidad: 2/5)

| Micro | Archivos | Acción | Depende de |
|---|---|---|---|
| **SA4-M1 — Webhook Config** |
| SA4-N1 | `entities/webhook-config.entity.ts` | Crear — webhook_configs entity | — |
| SA4-N2 | `controllers/webhook-config.controller.ts` | Crear — CRUD de configuraciones | SA4-N1 |
| SA4-N3 | `dto/create-webhook.dto.ts` | Crear — Input validation | — |
| **SA4-M2 — Event Bus + Delivery** |
| SA4-N4 | `services/webhook-event-bus.service.ts` | Crear — Event emitter tipado, suscripción | — |
| SA4-N5 | `services/webhook-delivery.service.ts` | Crear — HTTP POST con retry, backoff, HMAC | SA4-N4 |
| SA4-N6 | Modificar `message-relay.service.ts` | Disparar eventos `message.received` y `message.sent` | SA4-N4 |
| **SA4-M3 — Frontend** |
| SA4-N7 | `app/(dashboard)/settings/webhooks/page.tsx` | Crear — Webhook config page | SA4-N2 |
| SA4-N8 | `components/webhooks/webhook-form.tsx` | Crear — Form de configuración | — |

---

## Dependencies Graph

```
Batch 1 ── DB Migrations (paralelo)
├── SA1-M4: media.entity.ts + migrations
├── SA2-M1: automation_rules table
├── SA3-M1: ALTER conversations + notes table
└── SA4-M1: webhook_configs table

Batch 2 ── Backend Core (paralelo entre SA)
├── SA-1: Storage + Downloader + Thumbnails
├── SA-2: Rule Engine + Auto-reply
├── SA-3: Assignment + States + Notes
└── SA-4: Event Bus + Delivery

Batch 3 ── Frontend (paralelo)
├── SA1: Media preview upgrade
├── SA2: Rules UI + Form
├── SA3: Inbox filters, assignment, notes panel
└── SA4: Webhook config page

Batch 4 ── Integration + Tests
├── Hook rule engine into message handler
├── Hook media download into message handler
├── Hook webhook events into message relay
└── Tests (unit + integration)
```

---

## Risk Assessment

| Feature | Riesgo | Mitigación |
|---|---|---|
| Media CDN | MinIO no disponible en entorno | Usar sistema de archivos local como fallback |
| Chatbot | Reglas complejas de depurar | Logging extenso, modo dry-run en UI |
| Team Inbox | Conflictos de asignación | Lock optimista, notificación por WS |
| Webhooks | Timeout del destino | Retry con backoff, max 5 intentos |

## Success Criteria
- [ ] Media de WhatsApp se persiste y sirve desde storage propio
- [ ] Regla "si contiene X → responder Y" funciona end-to-end
- [ ] Conversación se puede asignar a agente y cambiar estado
- [ ] Webhook se dispara cuando llega un mensaje
- [ ] Build pasa, tests pasan
