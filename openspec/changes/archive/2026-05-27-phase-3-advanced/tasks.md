# Tasks: Phase 3 — Advanced Features

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3500 |
| 400-line budget risk | HIGH |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

---

## Task Organization

4 Super-Agentes, 14 micro-agentes, ~48 nano-agentes, en 4 batches secuenciales.

---

### Batch 1 — DB Migrations + Entities (paralelo entre SA)

#### ☐ SA1-M1: Media Entity + Migration
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA1-N1 | `modules/media/entities/media.entity.ts` | Crear | nestjs-best-practices |
| SA1-N2 | `database/migrations/009-create-media.ts` | Crear | nestjs-best-practices |

#### ☐ SA2-M1: Rules Entity + Migration
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA2-N1 | `modules/chatbot/entities/automation-rule.entity.ts` | Crear | nestjs-best-practices |
| SA2-N2 | `database/migrations/010-create-automation-rules.ts` | Crear | nestjs-best-practices |

#### ☐ SA3-M1: Conversation Extensions + Notes
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA3-N1 | Modificar `modules/whatsapp/entities/conversation.entity.ts` | Modificar — agregar assigned_to, status | nestjs-best-practices |
| SA3-N2 | `modules/inbox/entities/conversation-note.entity.ts` | Crear | nestjs-best-practices |
| SA3-N3 | `database/migrations/011-alter-conversations-add-assignment.ts` | Crear | nestjs-best-practices |
| SA3-N4 | `database/migrations/012-create-conversation-notes.ts` | Crear | nestjs-best-practices |

#### ☐ SA4-M1: Webhook Config Entity
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA4-N1 | `modules/webhooks/entities/webhook-config.entity.ts` | Crear | nestjs-best-practices |
| SA4-N2 | `database/migrations/013-create-webhook-configs.ts` | Crear | nestjs-best-practices |

---

### Batch 2 — Media CDN (SA-1)

#### ☐ SA1-M2: Storage Service
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA1-N3 | `modules/media/services/media-storage.service.ts` | Crear — S3/MinIO abstraction | nestjs-best-practices |
| SA1-N4 | `apps/api/package.json` | Agregar `@aws-sdk/client-s3` | — |

#### ☐ SA1-M3: Downloader + Thumbnails
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA1-N5 | `modules/media/services/media-downloader.service.ts` | Crear — download from WhatsApp CDN | nestjs-best-practices |
| SA1-N6 | `modules/media/services/media-thumbnail.service.ts` | Crear — thumbnail generation | nestjs-best-practices |

#### ☐ SA1-M4: Controller + Module + Hook
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA1-N7 | `modules/media/controllers/media.controller.ts` | Crear | nestjs-best-practices |
| SA1-N8 | `modules/media/media.module.ts` | Crear | nestjs-best-practices |
| SA1-N9 | Modificar `message-handler.service.ts` | Hookear media download + update media_url | nestjs-best-practices |
| SA1-N10 | Tests: `test/whatsapp/media-downloader.spec.ts` | Crear | jest |

---

### Batch 3 — Chatbot (SA-2) + Team Inbox (SA-3) (paralelo)

#### ☐ SA2-M2: Rule Engine + Auto-reply
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA2-N3 | `modules/chatbot/services/rule-engine.service.ts` | Crear — condition matching engine | nestjs-best-practices |
| SA2-N4 | `modules/chatbot/services/auto-reply.service.ts` | Crear — execute reply actions | nestjs-best-practices |
| SA2-N5 | `modules/chatbot/services/ai-hook.service.ts` | Crear — external AI integration | nestjs-best-practices |
| SA2-N6 | `modules/chatbot/controllers/rule.controller.ts` | Crear — CRUD de reglas | nestjs-best-practices |
| SA2-N7 | `modules/chatbot/dto/create-rule.dto.ts` | Crear | nestjs-best-practices |
| SA2-N8 | Modificar `message-handler.service.ts` | Hookear rule engine en inbound | nestjs-best-practices |
| SA2-N9 | `modules/chatbot/chatbot.module.ts` | Crear | nestjs-best-practices |
| SA2-N10 | Tests: `test/whatsapp/rule-engine.spec.ts` | Crear | jest |

#### ☐ SA3-M2: Assignment + States + Notes
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA3-N5 | `modules/inbox/services/assignment.service.ts` | Crear | nestjs-best-practices |
| SA3-N6 | `modules/inbox/services/conversation-state.service.ts` | Crear | nestjs-best-practices |
| SA3-N7 | `modules/inbox/services/internal-notes.service.ts` | Crear | nestjs-best-practices |
| SA3-N8 | `modules/inbox/controllers/inbox.controller.ts` | Crear | nestjs-best-practices |
| SA3-N9 | `modules/inbox/inbox.module.ts` | Crear | nestjs-best-practices |
| SA3-N10 | Tests: `test/whatsapp/inbox.spec.ts` | Crear | jest |

#### ☐ SA4-M2: Webhook Event Bus + Delivery
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA4-N3 | `modules/webhooks/services/webhook-event-bus.service.ts` | Crear | nestjs-best-practices |
| SA4-N4 | `modules/webhooks/services/webhook-delivery.service.ts` | Crear — BullMQ queue + retry | nestjs-best-practices |
| SA4-N5 | `modules/webhooks/services/webhook-signature.service.ts` | Crear — HMAC | nestjs-best-practices |
| SA4-N6 | `modules/webhooks/controllers/webhook-config.controller.ts` | Crear | nestjs-best-practices |
| SA4-N7 | Modificar `message-relay.service.ts` | Emitir eventos al webhook bus | nestjs-best-practices |
| SA4-N8 | `modules/webhooks/webhooks.module.ts` | Crear | nestjs-best-practices |
| SA4-N9 | Tests: `test/whatsapp/webhooks.spec.ts` | Crear | jest |

---

### Batch 4 — Frontend (paralelo entre SA)

#### ☐ SA1 Frontend: Media Preview upgrade
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA1-N11 | Modificar `media-preview.tsx` | Usar signed URLs de storage | shadcn |
| SA1-N12 | Modificar `message-bubble.tsx` | Mostrar media persistente | shadcn |

#### ☐ SA2 Frontend: Automation Rules UI
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA2-N11 | `app/(dashboard)/automation/page.tsx` | Crear | shadcn |
| SA2-N12 | `components/automation/rule-card.tsx` | Crear | shadcn |
| SA2-N13 | `components/automation/rule-form.tsx` | Crear — condition builder | shadcn |
| SA2-N14 | `stores/automation-store.ts` | Crear — Zustand store | — |

#### ☐ SA3 Frontend: Team Inbox UI
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA3-N11 | Modificar `chat-sidebar.tsx` | Agregar filtros (my/unassigned/all) | shadcn |
| SA3-N12 | Modificar `chat-header.tsx` | Assign button + status selector | shadcn |
| SA3-N13 | `components/inbox/notes-panel.tsx` | Crear | shadcn |
| SA3-N14 | Modificar `chat-store.ts` | Agregar assignment, status, notes | — |

#### ☐ SA4 Frontend: Webhook Config Page
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA4-N10 | `app/(dashboard)/settings/webhooks/page.tsx` | Crear | shadcn |
| SA4-N11 | `components/webhooks/webhook-form.tsx` | Crear | shadcn |

---

### Batch 5 — Integration + Build + Tests

#### ☐ Integration Tests
| Nano | Archivo | Acción | Skills |
|---|---|---|---|
| SA5-N1 | `test/whatsapp/media-flow.spec.ts` | Crear — message → media download → storage → serve | jest |
| SA5-N2 | `test/whatsapp/rule-message-flow.spec.ts` | Crear — message → rule match → auto-reply | jest |
| SA5-N3 | `test/whatsapp/inbox-assignment-flow.spec.ts` | Crear — assign → WS event → filter | jest |
| SA5-N4 | `test/whatsapp/webhook-event-flow.spec.ts` | Crear — event → webhook delivery | jest |

---

## Dependencies Graph

```
Batch 1 ── (paralelo)
├── Media entity + migration
├── Rules entity + migration
├── Inbox: alter conversations + notes entity
└── Webhook config entity + migration

Batch 2 ── (secuencial interno)
└── SA-1: Storage → Downloader → Thumbnails → Controller → Hook

Batch 3 ── (paralelo entre SA)
├── SA-2: Rule Engine → Auto-reply → AI Hook → Controller → Hook
├── SA-3: Assignment → States → Notes → Controller
└── SA-4: Event Bus → Delivery → Signature → Controller → Hook relay

Batch 4 ── (paralelo)
├── SA1: Media preview upgrade
├── SA2: Automation UI
├── SA3: Inbox UI modifications
└── SA4: Webhook config page

Batch 5 ── (paralelo)
├── Integration tests
├── Build verify
└── Run all tests
```

## Verification
- Cada micro-agente: `npm run build` sin errores
- Cada batch: tests pasan
- Total: 108 tests existentes + ~40 nuevos = ~148 tests
