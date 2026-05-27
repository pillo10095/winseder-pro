# Tasks: Phase 2 — WhatsApp Integration

**Delivery strategy:** ask-on-risk
**Chain strategy:** stacked-to-main
**Review workload forecast:** ~2500 lines estimated → 400-line budget risk: HIGH → STOP for approval before apply

---

## Task Organization

6 Super-Agentes, 18 micro-agentes, ~57 nano-agentes, organizados en 5 batches secuenciales.

---

### Batch 1 — DB Migrations + Research (Día 1)

#### ☐ AG2-01: DB Migrations WhatsApp
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-01M | `apps/api/src/modules/whatsapp/migrations/xxx-whatsapp-sessions.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-02M | `apps/api/src/modules/whatsapp/migrations/xxx-messages.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-03M | `apps/api/src/modules/whatsapp/migrations/xxx-conversations.ts` | Crear | nestjs-best-practices | ☐ |

#### ☐ AG2-02: Entities + DTOs + Repos
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-04E | `apps/api/src/modules/whatsapp/entities/session.entity.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-05E | `apps/api/src/modules/whatsapp/entities/message.entity.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-06E | `apps/api/src/modules/whatsapp/entities/conversation.entity.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-07D | `apps/api/src/modules/whatsapp/dto/create-session.dto.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-08D | `apps/api/src/modules/whatsapp/dto/send-message.dto.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-09R | `apps/api/src/modules/whatsapp/repositories/session.repository.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-09R2 | `apps/api/src/modules/whatsapp/repositories/message.repository.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-09R3 | `apps/api/src/modules/whatsapp/repositories/conversation.repository.ts` | Crear | nestjs-best-practices | ☐ |

#### ☐ AG2-RESEARCH: Investigación Baileys
| Nano | Archivo | Acción | Skills | Estado |
|---|---|---|---|---|
| AG2-R1 | Investigar API Baileys v6 (QR, auth, mensajes, reconnect) | delegate(researcher) | whatsapp-automation | ☐ |
| AG2-R2 | Documentar snippets clave para usar en implementación | inline | - | ☐ |

---

### Batch 2 — Baileys Engine (Día 2-3)

#### ☐ AG2-10: Baileys Client Core
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-10S | `apps/api/src/modules/whatsapp/services/baileys-client.service.ts` | Crear | whatsapp-automation | ☐ |
| AG2-11S | `apps/api/src/modules/whatsapp/services/baileys-auth.service.ts` | Crear | whatsapp-automation | ☐ |
| AG2-12S | `apps/api/src/modules/whatsapp/services/baileys-reconnect.service.ts` | Crear | whatsapp-automation | ☐ |

#### ☐ AG2-13: QR Engine
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-13S | `apps/api/src/modules/whatsapp/services/qr.service.ts` | Crear | whatsapp-automation | ☐ |
| AG2-14S | `apps/api/src/modules/whatsapp/services/qr-events.service.ts` | Crear | whatsapp-automation | ☐ |

#### ☐ AG2-15: Message Handler
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-15S | `apps/api/src/modules/whatsapp/services/message-handler.service.ts` | Crear | whatsapp-automation | ☐ |
| AG2-16S | `apps/api/src/modules/whatsapp/services/message-relay.service.ts` | Crear | whatsapp-automation | ☐ |

#### ☐ AG2-17: Session Manager
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-17S | `apps/api/src/modules/whatsapp/services/session-manager.service.ts` | Crear | whatsapp-automation | ☐ |

---

### Batch 3 — Backend API + WS + Frontend Pages (Día 3-4)

#### ☐ AG2-18: WS Gateway
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-18G | `apps/api/src/modules/whatsapp/gateways/whatsapp.gateway.ts` | Crear | websocket-development | ☐ |
| AG2-19G | `apps/api/src/modules/whatsapp/gateways/events.ts` | Crear | websocket-development | ☐ |

#### ☐ AG2-20: Session Controller
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-20C | `apps/api/src/modules/whatsapp/controllers/session.controller.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-21C | `apps/api/src/modules/whatsapp/controllers/session-status.controller.ts` | Crear | nestjs-best-practices | ☐ |

#### ☐ AG2-22: Message Controller
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-22C | `apps/api/src/modules/whatsapp/controllers/message.controller.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-23C | `apps/api/src/modules/whatsapp/controllers/conversation.controller.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-24C | `apps/api/src/modules/whatsapp/controllers/webhook.controller.ts` | Crear | nestjs-best-practices | ☐ |

#### ☐ AG2-25: Module + Seeds
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-25N | `apps/api/src/modules/whatsapp/whatsapp.module.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-26H | `apps/api/src/modules/whatsapp/index.ts` | Crear | nestjs-best-practices | ☐ |
| AG2-27M | `apps/api/src/seeds/seed.whatsapp-session.ts` | Crear | nestjs-best-practices | ☐ |

#### ☐ AG2-28: QR Connect Page
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-28P | `apps/web/src/app/(dashboard)/whatsapp/page.tsx` | Crear | shadcn, websocket-development | ☐ |
| AG2-29P | `apps/web/src/app/(dashboard)/whatsapp/connect/page.tsx` | Crear | shadcn, websocket-development | ☐ |

#### ☐ AG2-30: WhatsApp Settings Components
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-30X | `apps/web/src/components/whatsapp/qr-scanner.tsx` | Crear | shadcn | ☐ |
| AG2-31X | `apps/web/src/components/whatsapp/session-card.tsx` | Crear | shadcn | ☐ |
| AG2-32X | `apps/web/src/components/whatsapp/connection-status.tsx` | Crear | shadcn | ☐ |
| AG2-33X | `apps/web/src/components/whatsapp/session-list.tsx` | Crear | shadcn | ☐ |

---

### Batch 4 — Chat UI Components (Día 4-5)

#### ☐ AG2-32: Chat Layout
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-34P | `apps/web/src/app/(dashboard)/chats/page.tsx` | Crear | shadcn | ☐ |
| AG2-35L | `apps/web/src/app/(dashboard)/chats/layout.tsx` | Crear | shadcn | ☐ |

#### ☐ AG2-34: Chat Sidebar
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-36X | `apps/web/src/components/chats/chat-sidebar.tsx` | Crear | shadcn | ☐ |
| AG2-37X | `apps/web/src/components/chats/chat-list-item.tsx` | Crear | shadcn | ☐ |

#### ☐ AG2-36: Chat Messages View
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-38X | `apps/web/src/components/chats/chat-messages.tsx` | Crear | shadcn | ☐ |
| AG2-39X | `apps/web/src/components/chats/message-bubble.tsx` | Crear | shadcn | ☐ |
| AG2-40X | `apps/web/src/components/chats/chat-header.tsx` | Crear | shadcn | ☐ |
| AG2-41X | `apps/web/src/components/chats/media-preview.tsx` | Crear | shadcn | ☐ |

#### ☐ AG2-40: Chat Input + Actions
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-42X | `apps/web/src/components/chats/chat-input.tsx` | Crear | shadcn | ☐ |
| AG2-43X | `apps/web/src/components/chats/chat-actions.tsx` | Crear | shadcn | ☐ |
| AG2-44X | `apps/web/src/components/chats/empty-state.tsx` | Crear | shadcn | ☐ |

#### ☐ AG2-43: Hooks + Stores
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-45K | `apps/web/src/hooks/use-whatsapp-socket.ts` | Crear | websocket-development | ☐ |
| AG2-46K | `apps/web/src/hooks/use-chats.ts` | Crear | websocket-development | ☐ |
| AG2-47K | `apps/web/src/hooks/use-send-message.ts` | Crear | websocket-development | ☐ |
| AG2-48Z | `apps/web/src/stores/chat-store.ts` | Crear | websocket-development | ☐ |
| AG2-49Z | `apps/web/src/stores/session-store.ts` | Crear | websocket-development | ☐ |

---

### Batch 5 — Anti-Ban + Tests (Día 5)

#### ☐ AG2-47: Anti-Ban Layer
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-50S | `apps/api/src/modules/whatsapp/services/anti-ban/rate-limiter.ts` | Crear | whatsapp-automation | ☐ |
| AG2-51S | `apps/api/src/modules/whatsapp/services/anti-ban/humanizer.ts` | Crear | whatsapp-automation | ☐ |
| AG2-52S | `apps/api/src/modules/whatsapp/services/anti-ban/fingerprint.ts` | Crear | whatsapp-automation | ☐ |
| AG2-53S | `apps/api/src/modules/whatsapp/services/anti-ban/health-monitor.ts` | Crear | whatsapp-automation | ☐ |

#### ☐ AG2-51: Tests
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG2-54T | `apps/api/test/whatsapp/session-manager.spec.ts` | Crear | (ninguna) | ☐ |
| AG2-55T | `apps/api/test/whatsapp/message-handler.spec.ts` | Crear | (ninguna) | ☐ |
| AG2-56T | `apps/api/test/whatsapp/baileys-client.spec.ts` | Crear | (ninguna) | ☐ |
| AG2-57T | `apps/api/test/whatsapp/rate-limiter.spec.ts` | Crear | (ninguna) | ☐ |

---

## Dependencies Graph

```
Batch 1 ─────────────────────────────────────
  AG2-01 ──→ AG2-02  (secuencial)
  AG2-RESEARCH (delegate, paralelo con AG2-01)

Batch 2 ─────────────────────────────────────
  AG2-10 → AG2-13 → AG2-15 → AG2-17  (cadena)
  (AG2-10 espera RESEARCH)

Batch 3 ──────────────────────────────────────
  AG2-18 ──→ AG2-20 ──→ AG2-22 ──→ AG2-25  (backend)
  AG2-28 ──→ AG2-30                       (frontend, paralelo)

Batch 4 ──────────────────────────────────────
  AG2-32 → AG2-34 → AG2-36 → AG2-40 → AG2-43  (cadena)

Batch 5 ──────────────────────────────────────
  AG2-47 ──→ AG2-51  (paralelo entre sí dentro del batch)
  Build + Verify al final
```

## Verification
- Cada micro-agente: compilar sin errores (`npm run build`)
- Cada batch: `npm run lint` pasa
- Al final: test suite completa
- Strict TDD: tests antes de implementar código core

## Review Workload Forecast
- Total estimated: ~2500 lines changed
- 400-line budget risk: HIGH
- Chained PRs recommended: Yes
- Decision needed before apply: Yes
