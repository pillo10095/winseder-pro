# Plan de Micro-Agentes para Desarrollo en Paralelo

## Filosofía
Cada agente hace **UNA SOLA COSA** y la hace bien. Tareas de 30-60 minutos cada una. 
Múltiples agentes en paralelo = desarrollo 3x-5x más rápido.

---

## 🧭 Estrategia de Paralelismo

```
     YO (Orquestador)
     │    │    │    │
     ▼    ▼    ▼    ▼
  ┌────┐┌────┐┌────┐┌────┐
  │ AZ ││ BZ ││ CZ ││ DZ │ ← Zonas (paralelas entre sí)
  └─┬──┘└─┬──┘└─┬──┘└─┬──┘
    │     │     │     │
    ▼     ▼     ▼     ▼
  Micro-agentes dentro de cada zona
```

### Zonas (corren en paralelo)
| Zona | Qué construye | Tipos de agentes |
|---|---|---|
| **Zona A: Database** | Schemas, migraciones, seeds, índices | AG-DB-* |
| **Zona B: Backend** | Módulos NestJS, workers, eventos | AG-BE-* |
| **Zona C: Frontend** | Páginas, componentes, hooks, stores | AG-FE-* |
| **Zona D: Infra** | Docker, CI/CD, scripts, docs | AG-INFRA-* |

NOTA: No siempre todas las zonas pueden correr en paralelo (dependencias). Pero DENTRO de cada zona, los micro-agentes SÍ son paralelizables.

---

## 📋 MAPA COMPLETO DE ~45 MICRO-AGENTES

### Fase 0 — Setup (5 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG0-1 | **DB Init** | Crear schema TypeORM vacío + conexión MySQL | nestjs-best-practices | sdd-apply | — |
| AG0-2 | **Docker Init** | Docker Compose con MySQL 8, Redis, MinIO, Nginx | (ninguna) | sdd-apply | AG0-1 |
| AG0-3 | **NestJS Init** | NestJS boilerplate + módulo común (guards, decorators) | nestjs-best-practices | sdd-apply | AG0-1, AG0-2 |
| AG0-4 | **Next.js Init** | Next.js + shadcn + layouts (auth/dashboard) | shadcn, vercel-react-best-practices | sdd-apply | AG0-1, AG0-2, AG0-3 |
| AG0-5 | **Shared Package** | `packages/shared/` con tipos, constantes, enums | (ninguna) | sdd-apply | AG0-3, AG0-4 |

> **Paralelismo real: AG0-1, AG0-2, AG0-3 arrancan juntos. AG0-4 espera AG0-3? No, los layouts no necesitan API todavía. AG0-5 depende de nadie.**

---

### Fase 1 — Auth (6 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG1-1 | **DB Users** | Migración: companies + users + plans + subscriptions | nestjs-best-practices | sdd-apply | — |
| AG1-2 | **Auth Module** | Register + Login + JWT + Refresh + 2FA | nestjs-best-practices, api-authentication | sdd-apply | AG1-1 (primero schema) |
| AG1-3 | **Tenancy Module** | Middleware multiempresa + guards por empresa | nestjs-best-practices | sdd-apply | AG1-2 |
| AG1-4 | **Login Page** | Página login + register + forgot password | shadcn | sdd-apply | AG1-3 (necesita endpoints) |
| AG1-5 | **Dashboard Shell** | Layout dashboard (sidebar, header, user menu) | shadcn, vercel-react-best-practices | sdd-apply | AG1-4 |
| AG1-6 | **Auth Middleware** | Protección de rutas Next.js + redirect si no auth | api-authentication | sdd-apply | AG1-4, AG1-5 |

> **Flujo: AG1-1 → AG1-2 → AG1-3 (backend). En paralelo: AG1-5 (shell sin datos) arranca apenas termina AG0-4. AG1-4 y AG1-6 cuando backend está listo.**

---

### Fase 2 — WhatsApp (18 micro-agentes — la más pesada)

#### Super-Agentes (Zonas Paralelas)

| SA | Zona | Nano | Micro | Skills | Arranca |
|----|------|------|-------|--------|---------|
| SA-1 | **DB + Entities** | 6 | 2 | `nestjs-best-practices` | Batch 1 |
| SA-2 | **Baileys Engine** | 8 | 4 | `whatsapp-automation` | Batch 1 (research) → Batch 2 |
| SA-3 | **Backend API + WS** | 10 | 4 | `nestjs-best-practices`, `websocket-development` | Batch 3 |
| SA-4 | **Frontend Pages (WhatsApp)** | 6 | 2 | `shadcn`, `websocket-development` | Batch 3 (tras WS ready) |
| SA-5 | **Frontend Chat (Componentes)** | 12 | 4 | `shadcn` | Batch 4 |
| SA-6 | **Anti-Ban + Tests** | 8 | 2 | `whatsapp-automation` | Batch 5 |

#### Micro-agentes por Super-Agente

| ID | Micro-agente | Tarea | Nano | Skills | Depende de |
|----|-------------|-------|------|--------|-----------|
| **SA-1** | | | | | |
| AG2-01 | **DB Migrations** | whatsapp_sessions, messages, conversations | 3 | nestjs-best-practices | — |
| AG2-02 | **Entities + DTOs + Repos** | Session, Message, Conversation entities + DTOs + repositories | 3 | nestjs-best-practices | AG2-01 |
| **SA-2** | | | | | |
| AG2-10 | **Baileys Client** | Core client + auth state + reconnect | 3 | whatsapp-automation | Research |
| AG2-13 | **QR Engine** | QR generation + events | 2 | whatsapp-automation | AG2-10 |
| AG2-15 | **Message Handler** | Inbound relay + outbound send | 2 | whatsapp-automation | AG2-10 |
| AG2-17 | **Session Manager** | CRUD sesiones + health check | 1 | whatsapp-automation | AG2-10, AG2-02 |
| **SA-3** | | | | | |
| AG2-18 | **WS Gateway** | Socket.io gateway + events | 2 | websocket-development | AG2-13, AG2-15 |
| AG2-20 | **Session Controller** | REST: CRUD sesiones + QR | 2 | nestjs-best-practices | AG2-17 |
| AG2-22 | **Message Controller** | REST: msgs + conversations + webhook | 3 | nestjs-best-practices | AG2-15, AG2-17 |
| AG2-25 | **Module + Seeds** | Module wiring + seed session | 3 | nestjs-best-practices | AG2-20, AG2-22 |
| **SA-4** | | | | | |
| AG2-28 | **QR Connect Page** | QR scanner + status display | 2 | shadcn, websocket-dev | AG2-18 |
| AG2-30 | **WhatsApp Settings** | Session cards + disconnect | 2 | shadcn | AG2-28 |
| **SA-5** | | | | | |
| AG2-32 | **Chat Layout** | Chats page layout + routing | 2 | shadcn | AG2-22 |
| AG2-34 | **Chat Sidebar** | Conversation list + search | 2 | shadcn | AG2-32 |
| AG2-36 | **Chat Messages View** | Bubbles + scroll + header | 4 | shadcn | AG2-34 |
| AG2-40 | **Chat Input + Actions** | Input + attachments + empty | 3 | shadcn | AG2-36 |
| AG2-43 | **Hooks + Stores** | WS hook + chat hook + stores | 4 | websocket-development, vercel-react-best-practices | AG2-18, AG2-22 |
| **SA-6** | | | | | |
| AG2-47 | **Anti-Ban Layer** | Rate limiter + humanizer + fingerprint + health | 4 | whatsapp-automation | AG2-10 |
| AG2-51 | **Tests** | Session + message + baileys + rate-limiter | 4 | (ninguna) | AG2-47, AG2-17, AG2-15 |

#### Grafo de Ejecución

```
Batch 1 ─────────────────────────────────────────────
  SA-1: AG2-01 → AG2-02  (secuencial)
  SA-2: [RESEARCH Baileys] ← delegate investigación

Batch 2 ─────────────────────────────────────────────
  SA-2: AG2-10 → AG2-13 → AG2-15 → AG2-17  (cadena)
  (AG2-10 espera research, después el resto en cadena)

Batch 3 ──────────────────────────────────────────────
  SA-3: AG2-18 ← AG2-20 ← AG2-22 ──→ AG2-25
  SA-4: AG2-28 ← AG2-30 (cuando WS esté listo)

Batch 4 ──────────────────────────────────────────────
  SA-5: AG2-32 → AG2-34 → AG2-36 → AG2-40 → AG2-43

Batch 5 ──────────────────────────────────────────────
  SA-6: AG2-47 ──→ AG2-51  (paralelos)
  Build + Verify
```

#### Skills por Micro-agente

| Skill | Micro-agentes que lo cargan |
|-------|---------------------------|
| `nestjs-best-practices` | AG2-01, AG2-02, AG2-20, AG2-22, AG2-25 |
| `whatsapp-automation` | AG2-10, AG2-13, AG2-15, AG2-17, AG2-47 |
| `websocket-development` | AG2-18, AG2-43 |
| `shadcn` | AG2-28, AG2-30, AG2-32, AG2-34, AG2-36, AG2-40 |
| `vercel-react-best-practices` | AG2-36, AG2-43 |

---

### Fase 3 — CRM (7 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG3-1 | **DB CRM** | Migración: contacts + tags + contact_tags + reminders | nestjs-best-practices | sdd-apply | — |
| AG3-2 | **Contacts CRUD** | API contactos + búsqueda FTS + populate desde WhatsApp | (ninguna) | sdd-apply | AG3-1 |
| AG3-3 | **Tags CRUD** | API tags + asignación a contactos | (ninguna) | sdd-apply | AG3-2 |
| AG3-4 | **Reminders** | API recordatorios + notificación | (ninguna) | sdd-apply | AG3-2 |
| AG3-5 | **Contacts Page** | Lista contactos + búsqueda + filtros + detalle | shadcn, crm-builder (patrones) | sdd-apply | AG3-2, AG3-3 |
| AG3-6 | **Tags UI** | Componente tags + selector + colores | shadcn | sdd-apply | AG3-5 |
| AG3-7 | **Reminder UI** | Calendario de seguimientos + notificaciones | shadcn | sdd-apply | AG3-4 |

> **Paralelismo: AG3-1 → AG3-2, AG3-3, AG3-4 en paralelo. AG3-5 espera AG3-2.**

---

### Fase 4 — Pipeline (5 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG4-1 | **DB Pipeline** | Migración: pipelines + stages + deals | nestjs-best-practices | sdd-apply | — |
| AG4-2 | **Pipeline API** | CRUD pipelines, stages, deals + mover entre stages | (ninguna) | sdd-apply | AG4-1 |
| AG4-3 | **Assignment API** | Asignar deals a vendedores + filtros | (ninguna) | sdd-apply | AG4-2 |
| AG4-4 | **Kanban Board** | Componente drag & drop Kanban (dnd-kit) | shadcn, web-design-guidelines | sdd-apply | AG4-2 |
| AG4-5 | **Deal Detail** | Página detalle deal + timeline + linked contact | shadcn | sdd-apply | AG4-4 |

---

### Fase 5 — Campañas (8 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG5-1 | **DB Campaigns** | Migración: campaigns + templates + campaign_contacts | nestjs-best-practices | sdd-apply | — |
| AG5-2 | **Templates API** | CRUD plantillas + variables + previsualización | (ninguna) | sdd-apply | AG5-1 |
| AG5-3 | **CSV Import** | Importar Excel/CSV + validación + log | csv-excel-merger | sdd-apply | AG5-1 |
| AG5-4 | **Campaigns API** | CRUD campañas + programación + pausar/reanudar | (ninguna) | sdd-apply | AG5-2, AG5-3 |
| AG5-5 | **Campaign Worker** | Worker BullMQ que procesa campañas | bullmq-specialist | sdd-apply | AG5-4 |
| AG5-6 | **Message Worker** | Worker de envío individual con rate limiting POR sesión | bullmq-specialist | sdd-apply | AG5-5 |
| AG5-7 | **Campaigns UI** | Páginas: listar, crear, detalle campaña + editor plantillas | shadcn | sdd-apply | AG5-4 |
| AG5-8 | **Reports UI** | Reportes en tiempo real con gráficos (enviados/leídos/fallidos) | websocket-development, shadcn | sdd-apply | AG5-4, AG5-7 |

---

### Fase 6 — Automatizaciones (6 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG6-1 | **DB Automations** | Migración: automations + rules + actions + logs | nestjs-best-practices | sdd-apply | — |
| AG6-2 | **Automations API** | CRUD automatizaciones + reglas + acciones | (ninguna) | sdd-apply | AG6-1 |
| AG6-3 | **Rule Evaluator** | Worker que evalúa reglas contra eventos | websocket-development | sdd-apply | AG6-2 |
| AG6-4 | **Action Executor** | Ejecutor de acciones (send_msg, change_stage, webhook) | (ninguna) | sdd-apply | AG6-3 |
| AG6-5 | **Builder UI** | Builder visual: "si [condición] → entonces [acción]" | shadcn, skill-creator | sdd-apply | AG6-2 |
| AG6-6 | **Logs UI** | Lista ejecuciones + estado + detalle | shadcn | sdd-apply | AG6-5 |

---

### Fase 7 — IA (5 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG7-1 | **DB AI** | Migración: ai_agents + training_docs + ai_logs | nestjs-best-practices | sdd-apply | — |
| AG7-2 | **AI Provider** | Cliente OpenAI + Ollama + abstracción de provider | llm-integration | **delegate** (investigación) | AG7-1 |
| AG7-3 | **AI Agent** | Agente automático por empresa + clasificación de intención | llm-integration | sdd-apply | AG7-2 |
| AG7-4 | **AI Suggestion** | Respuestas sugeridas + resumen + detección clientes calientes | (ninguna) | sdd-apply | AG7-3 |
| AG7-5 | **AI UI** | Configuración agente + sugerencias en chat + training docs | shadcn | sdd-apply | AG7-4 |

---

### Fase 8 — Anti-Ban (4 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG8-1 | **Rate Limiter** | Rate limiting inteligente por hora/día/sesión configurable | whatsapp-automation | sdd-apply | — |
| AG8-2 | **Health Monitor** | Monitoreo de salud + reducción automática + alertas | (ninguna) | sdd-apply | AG8-1 |
| AG8-3 | **Humanizer** | Delays humanizados + pausas + horarios + rotación | (ninguna) | sdd-apply | AG8-1 |
| AG8-4 | **Anti-Ban Dashboard** | Panel de salud de sesiones + estadísticas | shadcn | sdd-apply | AG8-2, AG8-3 |

---

### Fase 9 — Admin (4 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG9-1 | **Admin API** | Endpoints superadmin + impersonate + métricas globales | api-authentication | sdd-apply | — |
| AG9-2 | **Subscription API** | Webhooks Conekta + gestión suscripciones + facturas | (ninguna) | sdd-apply | AG9-1 |
| AG9-3 | **Admin UI** | Panel admin: empresas, usuarios, planes | shadcn | sdd-apply | AG9-1 |
| AG9-4 | **Billing UI** | Facturación + historial + cambio de plan | shadcn | sdd-apply | AG9-2 |

---

### Fase 10 — Producción (6 agentes)

| ID | Agente | Tarea | Skills | Tipo | Paralelo con |
|---|---|---|---|---|---|
| AG10-1 | **Tests BE** | Tests unitarios NestJS (Jest + supertest) por módulo | jest | sdd-apply | — |
| AG10-2 | **Tests FE** | Tests componentes React (Jest + RTL) | jest | sdd-apply | AG10-1 |
| AG10-3 | **Security Audit** | Rate limiting global, helmet, CORS, validación, sanitización | api-authentication, judgment-day (review) | sdd-verify | AG10-1 |
| AG10-4 | **Docker Prod** | Dockerfiles producción + compose.prod.yml + scripts backup | (ninguna) | sdd-apply | AG10-3 |
| AG10-5 | **Documentation** | Swagger/OpenAPI, README, deploy docs, FAQ | (ninguna) | sdd-apply | AG10-4 |
| AG10-6 | **Judgment Day** | Review adversarial de TODO el código | judgment-day, web-design-guidelines | judgment-day (skill) | AG10-5 |

---

## 📊 TOTAL: ~56 MICRO-AGENTES

| Fase | Agentes | Paralelizables |
|---|---|---|
| 0 — Setup | 5 | 3-4 |
| 1 — Auth | 6 | 3-4 |
| 2 — WhatsApp | 10 | 5-6 |
| 3 — CRM | 7 | 4-5 |
| 4 — Pipeline | 5 | 3-4 |
| 5 — Campañas | 8 | 4-6 |
| 6 — Automatizaciones | 6 | 3-4 |
| 7 — IA | 5 | 3-4 |
| 8 — Anti-Ban | 4 | 2-3 |
| 9 — Admin | 4 | 2-3 |
| 10 — Producción | 6 | 3-4 |
| **TOTAL** | **~56** | ~35-47 en paralelo |

---

## ⚡ Tipos de Sub-Agentes

### 1. sdd-apply (agente de implementación)
Para escribir código. Uso: `task(subagent_type="sdd-apply", prompt="...")`

**Cuándo usar**: Cada uno de los ~56 micro-agentes de arriba que dice "sdd-apply" se lanza con este tipo.

### 2. delegate (tarea en background)
Para investigaciones largas que no bloquean. Uso: `delegate(agent="explore", prompt="...")`

**Cuándo usar**: Investigación de Baileys, documentación de API externa, benchmark de rendimiento.

### 3. judgment-day (revisión adversarial)
Para revisar código. Lanza 2 revisores ciegos en paralelo.

**Cuándo usar**: Al final de cada fase, NO de cada micro-agente.

### 4. sdd-verify (validación)
Para verificar que lo implementado cumple lo especificado.

**Cuándo usar**: Cuando un micro-agente reporta "terminado" y antes de integrar.

---

## 🔄 Cómo se Orquesta en la Práctica

```
PASO 1: Yo recibo instrucción → "implementar Fase 2"
PASO 2: Lanzo TODOS los agentes paralelizables de Fase 2
         ┌──────────────────────────────────────────┐
         │ delegate(AG2-2 Baileys) ──┐              │
         │ task(AG2-1 DB) ───────────┤              │
         │ task(AG2-7 QR Page) ──────┤ (en paralelo)│
         │ task(AG2-8 Chat List) ────┘              │
         └──────────────────────────────────────────┘
PASO 3: Espero resultados → integro → reviso
PASO 4: Lanzo AG2-3, AG2-5, AG2-6 (dependen de AG2-1 y AG2-2)
PASO 5: Lanzo AG2-4 (depende de AG2-3)
PASO 6: Lanzo AG2-9, AG2-10 (dependen de AG2-4 y AG2-8)
PASO 7: Lanzo judgment-day sobre toda la Fase 2
```

Cada paso puede tener múltiples agentes en paralelo. El orquestador (yo) solo revisa y coordina.

---

## 🧠 Skills que Carga CADA Micro-Agente

Cada micro-agente carga automáticamente las skills según su columna "Skills":

| Skill | Se carga cuando... |
|---|---|
| `nestjs-best-practices` | El agente escribe código NestJS |
| `shadcn` | El agente escribe componentes UI |
| `vercel-react-best-practices` | El agente escribe React/Next.js |
| `whatsapp-automation` | El agente toca Baileys o WhatsApp |
| `api-authentication` | El agente toca auth/JWT |
| `websocket-development` | El agente toca WebSocket/Socket.io |
| `csv-excel-merger` | El agente procesa CSV/Excel |
| `bullmq-specialist` | El agente crea workers/colas |
| `llm-integration` | El agente integra OpenAI/Ollama |
| `crm-builder` | El agente construye vistas CRM |
| `web-design-guidelines` | El agente revisa UX/UI |
| `judgment-day` | Revisión final |
| `jest` | El agente escribe tests |
| `skill-creator` | Necesitamos crear una skill nueva |

El orquestador (yo) sabe qué skills cargar según el ID del agente y su tarea.
