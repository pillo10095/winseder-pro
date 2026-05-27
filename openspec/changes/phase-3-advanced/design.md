# Design: Phase 3 — Advanced Features

## Technical Approach

4 módulos NestJS independientes, cada uno con su propio módulo, entidades, servicios, controladores. Se integran con el módulo WhatsApp existente mediante EventEmitter (para webhooks y chatbot) y hooks directos (para media download y team inbox). Frontend extiende componentes existentes de chat.

## Architecture Decisions

### Decision: Storage Backend

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| @aws-sdk/client-s3 | Más pesado, pero compatible con S3, MinIO, R2 | ✓ Elegido |
| MinIO SDK directo | Menos features, vendor lock | ✗ |

**Rationale**: SDK de S3 funciona con cualquier proveedor S3-compatible (MinIO, AWS, Cloudflare R2). Env var `STORAGE_PROVIDER` + `STORAGE_ENDPOINT` seleccionan el backend.

### Decision: Rule Engine

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| JSON conditions nativo | Simple, sin deps externas | ✓ Elegido |
| DSL / expresión language | Más potente, pero overkill para MVP | ✗ |

**Rationale**: Condiciones en JSON son fáciles de almacenar, validar, y editar desde UI. `{field, operator, value}` cubre contains/equals/regex.

### Decision: Webhook Delivery

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| BullMQ queue | Persistente, retry nativo, ya existe en el proyecto | ✓ Elegido |
| setTimeout + Map | Volátil, pierde eventos al reiniciar | ✗ |

**Rationale**: BullMQ ya está en las dependencias (`@nestjs/bullmq`). Usamos una queue `webhook-delivery` para persistencia y retry.

## Data Flow

```
WhatsApp Message (inbound)
  │
  ├──→ MessageHandlerService (existing)
  │     ├──→ [NEW] MediaDownloader → S3/MinIO → update media_url
  │     ├──→ [NEW] RuleEngine → match? → AutoReplyService → BaileysClient
  │     └──→ MessageRelayService (existing)
  │           ├──→ WS Gateway → Frontend
  │           └──→ [NEW] EventBus → WebhookDelivery → HTTP POST
  │
  └──→ [NEW] InboxService → update conversation state
```

## File Changes

### Media CDN

| File | Acción |
|------|--------|
| `src/modules/media/media.module.ts` | Crear |
| `src/modules/media/entities/media.entity.ts` | Crear |
| `src/modules/media/services/media-storage.service.ts` | Crear |
| `src/modules/media/services/media-downloader.service.ts` | Crear |
| `src/modules/media/services/media-thumbnail.service.ts` | Crear |
| `src/modules/media/controllers/media.controller.ts` | Crear |
| `src/modules/whatsapp/services/message-handler.service.ts` | Modificar — hookear media download |
| `apps/web/components/chats/media-preview.tsx` | Modificar — usar signed URLs |
| `apps/web/components/chats/message-bubble.tsx` | Modificar — mostrar media de storage |

### Chatbot

| File | Acción |
|------|--------|
| `src/modules/chatbot/chatbot.module.ts` | Crear |
| `src/modules/chatbot/entities/automation-rule.entity.ts` | Crear |
| `src/modules/chatbot/services/rule-engine.service.ts` | Crear |
| `src/modules/chatbot/services/auto-reply.service.ts` | Crear |
| `src/modules/chatbot/services/ai-hook.service.ts` | Crear |
| `src/modules/chatbot/controllers/rule.controller.ts` | Crear |
| `src/modules/chatbot/dto/create-rule.dto.ts` | Crear |
| `src/modules/whatsapp/services/message-handler.service.ts` | Modificar — hookear rule engine |
| `apps/web/app/(dashboard)/automation/page.tsx` | Crear |
| `apps/web/components/automation/rule-card.tsx` | Crear |
| `apps/web/components/automation/rule-form.tsx` | Crear |

### Team Inbox

| File | Acción |
|------|--------|
| `src/modules/inbox/inbox.module.ts` | Crear |
| `src/modules/inbox/entities/conversation-note.entity.ts` | Crear |
| `src/modules/inbox/services/assignment.service.ts` | Crear |
| `src/modules/inbox/services/conversation-state.service.ts` | Crear |
| `src/modules/inbox/services/internal-notes.service.ts` | Crear |
| `src/modules/inbox/controllers/inbox.controller.ts` | Crear |
| `src/modules/whatsapp/entities/conversation.entity.ts` | Modificar — agregar assigned_to, status |
| `apps/web/components/chats/chat-sidebar.tsx` | Modificar — filtros de asignación |
| `apps/web/components/chats/chat-header.tsx` | Modificar — assign button, status selector |
| `apps/web/components/inbox/notes-panel.tsx` | Crear |
| `apps/web/stores/chat-store.ts` | Modificar — assignment, status, notes |

### Webhooks

| File | Acción |
|------|--------|
| `src/modules/webhooks/webhooks.module.ts` | Crear |
| `src/modules/webhooks/entities/webhook-config.entity.ts` | Crear |
| `src/modules/webhooks/services/webhook-event-bus.service.ts` | Crear |
| `src/modules/webhooks/services/webhook-delivery.service.ts` | Crear |
| `src/modules/webhooks/services/webhook-signature.service.ts` | Crear |
| `src/modules/webhooks/controllers/webhook-config.controller.ts` | Crear |
| `src/modules/whatsapp/services/message-relay.service.ts` | Modificar — emitir eventos |
| `apps/web/app/(dashboard)/settings/webhooks/page.tsx` | Crear |
| `apps/web/components/webhooks/webhook-form.tsx` | Crear |

## Testing Strategy

| Feature | Unit | Integration |
|---------|------|-------------|
| Media CDN | Storage service (mock S3), thumbnail gen | Download + upload flow |
| Chatbot | Rule engine (10+ condition combos), auto-reply service | Message → rule match → reply |
| Team Inbox | Assignment logic, state transitions, notes CRUD | Assignment → WS event |
| Webhooks | Event bus, delivery with retry, HMAC signing | Event → HTTP POST |

## Open Questions

- [ ] MinIO disponible en producción o usamos S3 directo?
- [ ] Proveedor de AI para chatbot hook? (OpenAI, Claude, custom?)
