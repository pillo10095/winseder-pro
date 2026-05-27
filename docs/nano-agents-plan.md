# Plan de Nano-Agentes (Nivel de Archivo)

## Filosofía
Cada nano-agente produce **UN SOLO ARCHIVO**. 
- Sin contexto innecesario
- Sin dependencias ocultas
- 100% enfocado
- Se lanza en paralelo con sus vecinos

## Patrón de Nomenclatura

```
{AG|D}{Fase}{Secuencia}-{Capa}{Número}

Capa:
  M  = Migration SQL
  E  = Entity TypeORM
  D  = DTO/Input/Output
  R  = Repository
  S  = Service
  C  = Controller
  N  = Module
  G  = Gateway (WS)
  W  = Worker
  T  = Test
  P  = Page (Next.js)
  L  = Layout
  X  = Component
  K  = Hook
  Z  = Store
  H  = Shared type/helper
  I  = Infra (Docker/Nginx/Script)

Ejemplo: AG2-5E = Fase 2, agente 5, Entity
Ejemplo: AG2-5C = Fase 2, agente 5, Controller
```

---

## 🧬 FASE 0 — SETUP (28 nano-agentes)

### Zona DB (3)
```
AG0-01M  →  apps/api/src/config/database.config.ts         ← Config TypeORM MySQL
AG0-02M  →  docker/mysql/init/01-schema.sql                ← DB inicial vacía
AG0-03M  →  docker/mysql/my.cnf                            ← Config MySQL
```

### Zona Backend (11)
```
AG0-04E  →  apps/api/src/common/entities/base.entity.ts   ← BaseEntity (id, fechas)
AG0-05D  →  packages/shared/src/types/api-response.ts     ← ApiResponse<T>
AG0-06D  →  packages/shared/src/constants/index.ts        ← Constantes globales
AG0-07D  →  packages/shared/src/enums/index.ts            ← Enums globales
AG0-08N  →  apps/api/src/app.module.ts                    ← AppModule raíz
AG0-09N  →  apps/api/src/common/common.module.ts          ← CommonModule
AG0-10S  →  apps/api/src/config/env.config.ts             ← Env validation
AG0-11S  →  apps/api/src/main.ts                          ← Bootstrap (puerto, CORS, etc.)
AG0-12S  →  apps/api/src/health/health.controller.ts      ← GET /api/health
AG0-13S  →  apps/api/src/health/health.module.ts          ← HealthModule
AG0-14T  →  apps/api/test/app.e2e-spec.ts                 ← Test de health
```

### Zona Frontend (10)
```
AG0-15P  →  apps/web/src/app/layout.tsx                   ← Root layout
AG0-16L  →  apps/web/src/app/(auth)/layout.tsx            ← Auth layout (centered)
AG0-17L  →  apps/web/src/app/(dashboard)/layout.tsx       ← Dashboard layout (sidebar)
AG0-18X  →  apps/web/src/components/ui/                 ← shadcn init (botones, inputs)
AG0-19X  →  apps/web/src/components/layout/sidebar.tsx    ← Sidebar component
AG0-20X  →  apps/web/src/components/layout/header.tsx     ← Header component
AG0-21Z  →  apps/web/src/stores/auth-store.ts             ← Zustand auth store
AG0-22H  →  apps/web/src/lib/api-client.ts                ← Axios/fetch wrapper
AG0-23H  →  apps/web/src/lib/utils.ts                     ← cn(), formatDate(), etc.
AG0-24P  →  apps/web/src/app/page.tsx                     ← Landing/redirect
```

### Zona Infra (4)
```
AG0-25I  →  docker-compose.yml                            ← Compose completo
AG0-26I  →  docker/nginx.conf                             ← Nginx config
AG0-27I  →  docker/Dockerfile.api                         ← Dockerfile backend
AG0-28I  →  docker/Dockerfile.web                         ← Dockerfile frontend
```

---

## 🧬 FASE 1 — AUTH (35 nano-agentes)

### Zona DB (4)
```
AG1-01M  →  apps/api/src/modules/tenancy/ migrations/*     ← companies + plans + subscriptions
AG1-02M  →  apps/api/src/modules/auth/migrations/*         ← users + permissions
AG1-03M  →  apps/api/src/seeds/seed.plans.ts              ← Planes por defecto
AG1-04M  →  apps/api/src/seeds/seed.admin.ts              ← Superadmin inicial
```

### Zona Backend Auth (12)
```
AG1-05E  →  apps/api/src/modules/auth/entities/user.entity.ts
AG1-06D  →  apps/api/src/modules/auth/dto/register.dto.ts
AG1-07D  →  apps/api/src/modules/auth/dto/login.dto.ts
AG1-08D  →  apps/api/src/modules/auth/dto/token.dto.ts
AG1-09R  →  apps/api/src/modules/auth/repositories/user.repository.ts
AG1-10S  →  apps/api/src/modules/auth/services/auth.service.ts       ← register + login
AG1-11S  →  apps/api/src/modules/auth/services/jwt.service.ts        ← generate + verify JWT
AG1-12S  →  apps/api/src/modules/auth/services/2fa.service.ts        ← TOTP
AG1-13C  →  apps/api/src/modules/auth/controllers/auth.controller.ts ← endpoints
AG1-14G  →  apps/api/src/common/guards/jwt-auth.guard.ts            ← JWT Guard
AG1-15G  →  apps/api/src/common/guards/roles.guard.ts               ← Roles Guard
AG1-16N  →  apps/api/src/modules/auth/auth.module.ts
```

### Zona Backend Tenancy (6)
```
AG1-17E  →  apps/api/src/modules/tenancy/entities/company.entity.ts
AG1-18E  →  apps/api/src/modules/tenancy/entities/plan.entity.ts
AG1-19E  →  apps/api/src/modules/tenancy/entities/subscription.entity.ts
AG1-20D  →  apps/api/src/modules/tenancy/dto/company.dto.ts
AG1-21M  →  apps/api/src/common/middleware/tenancy.middleware.ts     ← Set companyId
AG1-22N  →  apps/api/src/modules/tenancy/tenancy.module.ts
```

### Zona Frontend (10)
```
AG1-23P  →  apps/web/src/app/(auth)/login/page.tsx
AG1-24P  →  apps/web/src/app/(auth)/register/page.tsx
AG1-25P  →  apps/web/src/app/(auth)/forgot-password/page.tsx
AG1-26X  →  apps/web/src/components/auth/login-form.tsx
AG1-27X  →  apps/web/src/components/auth/register-form.tsx
AG1-28X  →  apps/web/src/components/auth/protected-route.tsx       ← Next.js middleware
AG1-29K  →  apps/web/src/hooks/use-auth.ts                          ← Login/logout/refresh
AG1-30K  →  apps/web/src/hooks/use-current-user.ts                  ← Obtener usuario actual
AG1-31P  →  apps/web/src/app/(dashboard)/page.tsx                   ← Dashboard vacío
AG1-32P  →  apps/web/src/app/(dashboard)/settings/page.tsx          ← Perfil / 2FA
```

### Zona Tests (3)
```
AG1-33T  →  apps/api/test/auth/auth.service.spec.ts
AG1-34T  →  apps/api/test/auth/auth.controller.spec.ts
AG1-35T  →  apps/api/test/auth/jwt.guard.spec.ts
```

---

## 🧬 FASE 2 — WHATSAPP (54 nano-agentes)

### Super-Agente 1: DB + Entities (6 nano)

```
AG2-01M  →  apps/api/src/modules/whatsapp/migrations/xxx-whatsapp-sessions.ts
AG2-02M  →  apps/api/src/modules/whatsapp/migrations/xxx-messages.ts
AG2-03M  →  apps/api/src/modules/whatsapp/migrations/xxx-conversations.ts
AG2-04E  →  apps/api/src/modules/whatsapp/entities/session.entity.ts
AG2-05E  →  apps/api/src/modules/whatsapp/entities/message.entity.ts
AG2-06E  →  apps/api/src/modules/whatsapp/entities/conversation.entity.ts
AG2-07D  →  apps/api/src/modules/whatsapp/dto/create-session.dto.ts
AG2-08D  →  apps/api/src/modules/whatsapp/dto/send-message.dto.ts
AG2-09R  →  apps/api/src/modules/whatsapp/repositories/*.ts  ← session + message + conversation repos
```

### Super-Agente 2: Baileys Engine (8 nano)

```
AG2-10S  →  apps/api/src/modules/whatsapp/services/baileys-client.service.ts     ← Core Baileys
AG2-11S  →  apps/api/src/modules/whatsapp/services/baileys-auth.service.ts       ← Auth state management
AG2-12S  →  apps/api/src/modules/whatsapp/services/baileys-reconnect.service.ts  ← Auto-reconnect logic
AG2-13S  →  apps/api/src/modules/whatsapp/services/qr.service.ts                ← QR generation
AG2-14S  →  apps/api/src/modules/whatsapp/services/qr-events.service.ts         ← QR event emitter
AG2-15S  →  apps/api/src/modules/whatsapp/services/message-handler.service.ts   ← Inbound messages
AG2-16S  →  apps/api/src/modules/whatsapp/services/message-relay.service.ts     ← Relay to WS/DB
AG2-17S  →  apps/api/src/modules/whatsapp/services/session-manager.service.ts   ← CRUD + health
```

### Super-Agente 3: Backend API + WS Gateway (10 nano)

```
AG2-18G  →  apps/api/src/modules/whatsapp/gateways/whatsapp.gateway.ts          ← Socket.io gateway
AG2-19G  →  apps/api/src/modules/whatsapp/gateways/events.ts                    ← Event names + types
AG2-20C  →  apps/api/src/modules/whatsapp/controllers/session.controller.ts     ← CRUD sessions
AG2-21C  →  apps/api/src/modules/whatsapp/controllers/session-status.controller.ts ← Status + QR
AG2-22C  →  apps/api/src/modules/whatsapp/controllers/message.controller.ts     ← Send messages
AG2-23C  →  apps/api/src/modules/whatsapp/controllers/conversation.controller.ts ← List conversations
AG2-24C  →  apps/api/src/modules/whatsapp/controllers/webhook.controller.ts     ← Baileys webhook
AG2-25N  →  apps/api/src/modules/whatsapp/whatsapp.module.ts
AG2-26H  →  apps/api/src/modules/whatsapp/index.ts                              ← Re-exports
AG2-27M  →  apps/api/src/seeds/seed.whatsapp-session.ts                         ← Session de prueba
```

### Super-Agente 4: Frontend WhatsApp Pages (6 nano)

```
AG2-28P  →  apps/web/src/app/(dashboard)/whatsapp/page.tsx                      ← WhatsApp settings
AG2-29P  →  apps/web/src/app/(dashboard)/whatsapp/connect/page.tsx              ← QR scan page
AG2-30X  →  apps/web/src/components/whatsapp/qr-scanner.tsx                     ← QR display + status
AG2-31X  →  apps/web/src/components/whatsapp/session-card.tsx                   ← Card sesión + disconnect
AG2-32X  →  apps/web/src/components/whatsapp/connection-status.tsx              ← Badge estado
AG2-33X  →  apps/web/src/components/whatsapp/session-list.tsx                   ← Grid de sesiones
```

### Super-Agente 5: Frontend Chat Componentes + Hooks (16 nano)

```
AG2-34P  →  apps/web/src/app/(dashboard)/chats/page.tsx                         ← Chat page
AG2-35L  →  apps/web/src/app/(dashboard)/chats/layout.tsx                       ← Chat layout (sidebar + view)
AG2-36X  →  apps/web/src/components/chats/chat-sidebar.tsx                      ← Conversation list
AG2-37X  →  apps/web/src/components/chats/chat-list-item.tsx                    ← Single conversation item
AG2-38X  →  apps/web/src/components/chats/chat-messages.tsx                     ← Message scroll container
AG2-39X  →  apps/web/src/components/chats/message-bubble.tsx                   ← In/out bubble
AG2-40X  →  apps/web/src/components/chats/chat-header.tsx                       ← Contact info header
AG2-41X  →  apps/web/src/components/chats/media-preview.tsx                     ← Image/doc preview
AG2-42X  →  apps/web/src/components/chats/chat-input.tsx                        ← Input + send button
AG2-43X  →  apps/web/src/components/chats/chat-actions.tsx                      ← Attach/emoji/etc
AG2-44X  →  apps/web/src/components/chats/empty-state.tsx                       ← No conversations
AG2-45K  →  apps/web/src/hooks/use-whatsapp-socket.ts                          ← WS connection
AG2-46K  →  apps/web/src/hooks/use-chats.ts                                    ← Chats list + msgs
AG2-47K  →  apps/web/src/hooks/use-send-message.ts                             ← Send message
AG2-48Z  →  apps/web/src/stores/chat-store.ts                                  ← Zustand chat state
AG2-49Z  →  apps/web/src/stores/session-store.ts                               ← Zustand session
```

### Super-Agente 6: Anti-Ban + Tests (8 nano)

```
AG2-50S  →  apps/api/src/modules/whatsapp/services/anti-ban/rate-limiter.ts     ← Rate limiter
AG2-51S  →  apps/api/src/modules/whatsapp/services/anti-ban/humanizer.ts       ← Delays + pausas
AG2-52S  →  apps/api/src/modules/whatsapp/services/anti-ban/fingerprint.ts     ← UA rotation
AG2-53S  →  apps/api/src/modules/whatsapp/services/anti-ban/health-monitor.ts  ← Monitoreo
AG2-54T  →  apps/api/test/whatsapp/session-manager.spec.ts
AG2-55T  →  apps/api/test/whatsapp/message-handler.spec.ts
AG2-56T  →  apps/api/test/whatsapp/baileys-client.spec.ts
AG2-57T  →  apps/api/test/whatsapp/rate-limiter.spec.ts
```

---

## 🧬 FASE 3 — CRM (32 nano-agentes)

### DB (3)
```
AG3-01M  →  migrations: contacts + contact_tags
AG3-02M  →  migrations: tags + reminders
AG3-03M  →  indexes + FTS
```

### Backend (14)
```
AG3-04E  →  entities/contact.entity.ts
AG3-05E  →  entities/tag.entity.ts
AG3-06E  →  entities/reminder.entity.ts
AG3-07D  →  dto/contact.dto.ts
AG3-08D  →  dto/tag.dto.ts
AG3-09D  →  dto/reminder.dto.ts
AG3-10R  →  repositories/contact.repository.ts
AG3-11R  →  repositories/tag.repository.ts
AG3-12S  →  services/contact.service.ts
AG3-13S  →  services/tag.service.ts
AG3-14S  →  services/reminder.service.ts
AG3-15C  →  controllers/contact.controller.ts
AG3-16C  →  controllers/tag.controller.ts
AG3-17N  →  crm.module.ts
```

### Frontend (12)
```
AG3-18P  →  contacts/page.tsx
AG3-19P  →  contacts/[id]/page.tsx
AG3-20X  →  components/contacts/contact-table.tsx
AG3-21X  →  components/contacts/contact-card.tsx
AG3-22X  →  components/contacts/contact-form.tsx
AG3-23X  →  components/tags/tag-badge.tsx
AG3-24X  →  components/tags/tag-selector.tsx
AG3-25X  →  components/reminders/reminder-list.tsx
AG3-26X  →  components/reminders/reminder-form.tsx
AG3-27K  →  hooks/use-contacts.ts
AG3-28K  →  hooks/use-tags.ts
AG3-29K  →  hooks/use-reminders.ts
```

### Tests (3)
```
AG3-30T  →  contact.service.spec.ts
AG3-31T  →  tag.service.spec.ts
AG3-32T  →  contact.controller.spec.ts
```

---

## 🧬 FASE 4 — PIPELINE (25 nano-agentes)

```
AG4-01M  →  migrations: pipelines + stages
AG4-02M  →  migrations: deals
AG4-03E  →  entities/pipeline.entity.ts
AG4-04E  →  entities/pipeline-stage.entity.ts
AG4-05E  →  entities/deal.entity.ts
AG4-06D  →  dto/pipeline.dto.ts
AG4-07D  →  dto/deal.dto.ts
AG4-08R  →  repositories/pipeline.repository.ts
AG4-09R  →  repositories/deal.repository.ts
AG4-10S  →  services/pipeline.service.ts
AG4-11S  →  services/deal.service.ts
AG4-12S  →  services/stage-transition.service.ts    ← Mover entre etapas
AG4-13C  →  controllers/pipeline.controller.ts
AG4-14C  →  controllers/deal.controller.ts
AG4-15N  →  pipeline.module.ts
AG4-16P  →  crm/pipeline/page.tsx                   ← Kanban view
AG4-17P  →  crm/deals/[id]/page.tsx                 ← Deal detail
AG4-18X  →  components/pipeline/kanban-board.tsx    ← Drag & drop
AG4-19X  →  components/pipeline/kanban-column.tsx   ← Columna
AG4-20X  →  components/pipeline/deal-card.tsx       ← Card en columna
AG4-21X  →  components/pipeline/deal-form.tsx       ← Crear/editar deal
AG4-22X  →  components/pipeline/stage-selector.tsx  ← Dropdown etapas
AG4-23K  →  hooks/use-pipeline.ts
AG4-24K  →  hooks/use-deals.ts
AG4-25T  →  deal.service.spec.ts
```

---

## 🧬 FASE 5 — CAMPAÑAS (38 nano-agentes)

### DB (4)
```
AG5-01M  →  migrations: templates
AG5-02M  →  migrations: campaigns
AG5-03M  →  migrations: campaign_contacts
AG5-04M  →  migrations: imports_log
```

### Backend (16)
```
AG5-05E  →  entities/template.entity.ts
AG5-06E  →  entities/campaign.entity.ts
AG5-07E  →  entities/campaign-contact.entity.ts
AG5-08D  →  dto/template.dto.ts
AG5-09D  →  dto/campaign.dto.ts
AG5-10D  →  dto/campaign-contact.dto.ts
AG5-11R  →  repositories/template.repository.ts
AG5-12R  →  repositories/campaign.repository.ts
AG5-13R  →  repositories/campaign-contact.repository.ts
AG5-14S  →  services/template.service.ts
AG5-15S  →  services/campaign.service.ts
AG5-16S  →  services/csv-import.service.ts             ← CSV/Excel parser
AG5-17S  →  services/campaign-scheduler.service.ts     ← Programación
AG5-18C  →  controllers/template.controller.ts
AG5-19C  →  controllers/campaign.controller.ts
AG5-20N  →  campaigns.module.ts
```

### Workers (4)
```
AG5-21W  →  workers/campaign.worker.ts                 ← BullMQ consumer
AG5-22W  →  workers/message.worker.ts                  ← Envío individual
AG5-23W  →  workers/queue-definitions.ts               ← Queue names + config
AG5-24W  →  workers/worker.module.ts                   ← Module NestJS para workers
```

### Frontend (14)
```
AG5-25P  →  campaigns/page.tsx                          ← Lista campañas
AG5-26P  →  campaigns/new/page.tsx                      ← Crear campaña
AG5-27P  →  campaigns/[id]/page.tsx                     ← Detalle + reporte
AG5-28P  →  templates/page.tsx                          ← Lista plantillas
AG5-29P  →  templates/new/page.tsx                      ← Editor plantilla
AG5-30X  →  components/campaigns/template-editor.tsx    ← Editor con variables
AG5-31X  →  components/campaigns/csv-importer.tsx       ← Drag & drop CSV
AG5-32X  →  components/campaigns/campaign-form.tsx      ← Formulario campaña
AG5-33X  →  components/campaigns/campaign-progress.tsx  ← Barra de progreso
AG5-34X  →  components/campaigns/campaign-stats.tsx     ← Gráficos stats
AG5-35K  →  hooks/use-campaigns.ts
AG5-36K  →  hooks/use-templates.ts
AG5-37K  →  hooks/use-campaign-reports.ts              ← WS stats
AG5-38T  →  campaign.service.spec.ts
```

---

## 🧬 FASE 6 — AUTOMATIZACIONES (26 nano-agentes)

```
AG6-01M  →  migrations: automations + rules + actions + logs
AG6-02E  →  entities/automation.entity.ts
AG6-03E  →  entities/automation-rule.entity.ts
AG6-04E  →  entities/automation-action.entity.ts
AG6-05E  →  entities/automation-log.entity.ts
AG6-06D  →  dto/automation.dto.ts
AG6-07R  →  repositories/automation.repository.ts
AG6-08S  →  services/automation.service.ts           ← CRUD
AG6-09S  →  services/rule-evaluator.service.ts       ← Evalúa condiciones
AG6-10S  →  services/action-executor.service.ts      ← Ejecuta acciones
AG6-11S  →  services/automation-event-bus.ts         ← Escucha eventos
AG6-12C  →  controllers/automation.controller.ts
AG6-13N  →  automation.module.ts
AG6-14W  →  workers/automation.worker.ts             ← Worker de evaluación
AG6-15P  →  automations/page.tsx                     ← Lista automatizaciones
AG6-16P  →  automations/new/page.tsx                 ← Crear
AG6-17P  →  automations/[id]/page.tsx                ← Detalle + logs
AG6-18X  →  components/automations/rule-builder.tsx  ← Builder visual
AG6-19X  →  components/automations/condition-row.tsx ← Una condición
AG6-20X  →  components/automations/action-row.tsx    ← Una acción
AG6-21X  →  components/automations/trigger-selector.tsx
AG6-22X  →  components/automations/automation-log.tsx
AG6-23K  →  hooks/use-automations.ts
AG6-24K  →  hooks/use-automation-logs.ts
AG6-25T  →  automation.service.spec.ts
AG6-26T  →  rule-evaluator.spec.ts
```

---

## 🧬 FASE 7 — IA (20 nano-agentes)

```
AG7-01M  →  migrations: ai_agents + training_docs + ai_logs
AG7-02E  →  entities/ai-agent.entity.ts
AG7-03E  →  entities/ai-training-doc.entity.ts
AG7-04E  →  entities/ai-log.entity.ts
AG7-05D  →  dto/ai-agent.dto.ts
AG7-06R  →  repositories/ai-agent.repository.ts
AG7-07S  →  services/ai-provider.service.ts          ← Abstracción OpenAI/Ollama
AG7-08S  →  services/ai-agent.service.ts             ← Chat con contexto
AG7-09S  →  services/intent-classifier.service.ts     ← Clasificación
AG7-10S  →  services/suggestion.service.ts           ← Respuestas sugeridas
AG7-11S  →  services/conversation-summarizer.ts      ← Resumen
AG7-12S  →  services/hot-lead-detector.ts            ← Clientes calientes
AG7-13S  →  services/rag.service.ts                  ← Document training
AG7-14C  →  controllers/ai-agent.controller.ts
AG7-15N  →  ai.module.ts
AG7-16P  →  settings/ai/page.tsx                     ← Config agente
AG7-17P  →  settings/ai/training/page.tsx            ← Documentos entrenamiento
AG7-18X  →  components/chats/ai-suggestion.tsx       ← Sugerencia en chat
AG7-19K  →  hooks/use-ai-agent.ts
AG7-20T  →  ai-agent.service.spec.ts
```

---

## 🧬 FASE 8 — ANTI-BAN AVANZADO (12 nano-agentes)

```
AG8-01S  →  services/anti-ban/rate-limiter-v2.ts         ← V2 con más inteligencia
AG8-02S  →  services/anti-ban/adaptive-delay.ts          ← Delay que aprende
AG8-03S  →  services/anti-ban/quiet-hours.ts             ← Horarios configurables
AG8-04S  →  services/anti-ban/daily-budget.ts            ← Presupuesto diario
AG8-05S  →  services/anti-ban/report-detector.ts         ← Detecta reportes
AG8-06S  →  services/anti-ban/auto-pause.ts              ← Pausa automática
AG8-07S  →  services/anti-ban/session-cloner.ts          ← Clonar sesión
AG8-08S  →  services/anti-ban/proxy-rotator.ts           ← Rotar IP (futuro)
AG8-09C  →  controllers/anti-ban.controller.ts           ← Dashboard health
AG8-10X  →  components/whatsapp/health-dashboard.tsx     ← UI de salud
AG8-11K  →  hooks/use-session-health.ts
AG8-12T  →  rate-limiter-v2.spec.ts
```

---

## 🧬 FASE 9 — ADMIN (18 nano-agentes)

```
AG9-01E  →  entities/audit-log.entity.ts
AG9-02R  →  repositories/audit-log.repository.ts
AG9-03S  →  services/admin.service.ts               ← Superadmin operations
AG9-04S  →  services/audit.service.ts               ← Logging
AG9-05S  →  services/billing.service.ts             ← Conekta integration
AG9-06S  →  services/subscription.service.ts        ← Plan management
AG9-07C  →  controllers/admin.controller.ts
AG9-08C  →  controllers/billing.controller.ts
AG9-09N  →  admin.module.ts
AG9-10P  →  admin/page.tsx                          ← Admin dashboard
AG9-11P  →  admin/companies/page.tsx                ← Lista empresas
AG9-12P  →  admin/companies/[id]/page.tsx           ← Detalle empresa
AG9-13P  →  admin/users/page.tsx                    ← Usuarios global
AG9-14P  →  admin/plans/page.tsx                    ← Planes
AG9-15X  →  components/admin/company-card.tsx
AG9-16X  →  components/admin/impersonate-bar.tsx    ← Barra de impersonate
AG9-17K  →  hooks/use-admin.ts
AG9-18T  →  admin.service.spec.ts
```

---

## 🧬 FASE 10 — PRODUCCIÓN (24 nano-agentes)

```
AG10-01T  →  test/auth/auth.e2e-spec.ts              ← E2E auth flow
AG10-02T  →  test/whatsapp/whatsapp.e2e-spec.ts      ← E2E whatsapp
AG10-03T  →  test/crm/crm.e2e-spec.ts
AG10-04T  →  test/campaigns/campaigns.e2e-spec.ts
AG10-05T  →  test/automations/automations.e2e-spec.ts
AG10-06T  →  test/ai/ai.e2e-spec.ts
AG10-07S  →  security/rate-limiter-global.ts         ← express-rate-limit
AG10-08S  →  security/helmet.config.ts               ← Helmet
AG10-09S  →  security/cors.config.ts                 ← CORS
AG10-10S  →  security/validation.pipe.ts             ← Class-validator global
AG10-11S  →  security/sanitize.interceptor.ts        ← XSS sanitize
AG10-12I  →  docker-compose.prod.yml                 ← Producción
AG10-13I  →  docker/nginx.prod.conf                  ← Nginx producción
AG10-14I  →  scripts/backup.sh                       ← Backup MySQL + MinIO
AG10-15I  →  scripts/restore.sh                      ← Restore
AG10-16I  →  scripts/deploy.sh                       ← Deploy script
AG10-17D  →  docs/api/swagger.ts                     ← Config Swagger
AG10-18D  →  docs/api/README.md                      ← API doc
AG10-19D  →  docs/deploy/README.md                   ← Deploy instructions
AG10-20D  →  docs/deploy/FAQ.md                      ← FAQ
AG10-21D  →  docs/deploy/checklist.md                ← Go-live checklist
AG10-22D  →  README.md                               ← Root README
AG10-23J  →  judgment-day run                        ← Review adversarial
AG10-24J  →  judgment-day fixes                      ← Correcciones del review
```

---

## 📊 RESUMEN COMPLETO

| Fase | Ago DB | Ago BE | Ago FE | Ago WK | Ago Tests | Ago Infra | Ago Docs | TOTAL |
|---|---|---|---|---|---|---|---|---|
| 0 Setup | 3 | 11 | 10 | 0 | 1 | 3 | 0 | **28** |
| 1 Auth | 4 | 18 | 10 | 0 | 3 | 0 | 0 | **35** |
| 2 WhatsApp | 4 | 24 | 16 | 0 | 4 | 0 | 0 | **48** |
| 3 CRM | 3 | 14 | 12 | 0 | 3 | 0 | 0 | **32** |
| 4 Pipeline | 2 | 12 | 9 | 0 | 1 | 0 | 0 | **24** |
| 5 Campañas | 4 | 16 | 10 | 4 | 1 | 0 | 0 | **35** |
| 6 Automations | 1 | 13 | 8 | 1 | 2 | 0 | 0 | **25** |
| 7 IA | 1 | 14 | 3 | 0 | 1 | 0 | 0 | **19** |
| 8 Anti-Ban | 0 | 9 | 1 | 0 | 1 | 0 | 0 | **11** |
| 9 Admin | 1 | 9 | 6 | 0 | 1 | 0 | 0 | **17** |
| 10 Producción | 0 | 5 | 0 | 0 | 6 | 4 | 6 | **21** |
| **TOTAL** | **23** | **145** | **85** | **5** | **23** | **7** | **6** | **≈295** |

---

## ⚡ Cómo se Lanzan

### Lanzamiento en paralelo (ejemplo Fase 2, tanda 1):
```
// LANZADOS SIMULTÁNEAMENTE:
delegate("AG2-01M", "Crear migration whatsapp_sessions")
delegate("AG2-02M", "Crear migration messages")  
delegate("AG2-05E", "Crear entity Session")
delegate("AG2-06E", "Crear entity Message")
delegate("AG2-13S", "Crear Baileys client")       ← Este es delegate (investigación)
delegate("AG2-23P", "Crear página listado sesiones")
// → 6 nano-agentes en PARALELO
```

### Skills por tipo de archivo
```
Archivo .entity.ts  → nestjs-best-practices
Archivo .service.ts → nestjs-best-practices
Archivo .controller.ts → nestjs-best-practices
Archivo .gateway.ts → websocket-development
Archivo .worker.ts  → bullmq-specialist
Archivo page.tsx    → shadcn + vercel-react-best-practices
Archivo .spec.ts    → jest
Archivo Baileyes    → whatsapp-automation
Archivo CSV/Excel   → csv-excel-merger
Archivo LLM         → llm-integration
```
