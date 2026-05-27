# Wisender Pro — Plan de 10 Fases (Entregables de Negocio)

> **Filosofía**: Cada fase es un entregable que se puede MOSTRAR y USAR. No son tareas técnicas. 
> Cada fase termina con algo que un cliente potencial podría ver y decir "ah, esto funciona".

---

## Fase 0 — Setup & Fundación ⚙️
**Duración estimada**: 2-3 días  
**Dependencias**: Ninguna  
**Skills**: skill-creator, nestjs-best-practices, shadcn

### Entregable
Repositorio funcional con Docker Compose que levanta todo el stack vacío.

### Qué incluye
- Monorepo Turborepo con `apps/web` (Next.js) + `apps/api` (NestJS) + `workers/`
- Docker Compose con: MySQL 8, Redis Stack, MinIO, Nginx
- NestJS base con TypeORM + módulos vacíos (Clean Architecture)
- Next.js base con App Router + shadcn/ui + layouts (dashboard + auth)
- BullMQ configurado con Redis
- Variables de entorno documentadas
- Scripts de `docker-compose up -d` funcionales
- CI/CD básico (GitHub Actions para lint + test)

### Criterio de éxito
```bash
git clone && docker-compose up -d
# → API responde en localhost:4000/api/health
# → Frontend en localhost:3000
# → MySQL + Redis + MinIO corriendo
```

### Skills a cargar
- **AG2**: skill-creator (para crear skills custom si es necesario)
- **AG3**: nestjs-best-practices (configuración base)
- **AG9**: shadcn (componentes base), vercel-react-best-practices

---

## Fase 1 — Registro y Login 👤
**Duración estimada**: 3-4 días  
**Dependencias**: Fase 0  
**Skills**: nestjs-best-practices, api-authentication, shadcn

### Entregable
Un usuario puede registrarse, iniciar sesión y ver un dashboard vacío.

### Qué incluye
- Backend: módulo Auth (register + login + JWT + refresh tokens)
- Backend: módulo Tenancy (companies, users, planes)
- Backend: guards JWT + roles + decorator `@CurrentUser()`
- Frontend: login + register + layout dashboard con sidebar
- Frontend: protección de rutas con middleware Next.js
- Base de datos: migraciones de `companies`, `users`, `plans`, `subscriptions`

### Criterio de éxito
```
1. Usuario se registra → se crea empresa gratuita
2. Usuario inicia sesión → ve dashboard vacío
3. Refresh token funciona
4. Cerrar sesión → redirige a login
```

### Skills a cargar
- **AG3**: nestjs-best-practices, api-authentication
- **AG9**: shadcn

---

## Fase 2 — Conectar WhatsApp 📱
**Duración estimada**: 5-7 días (la más riesgosa)  
**Dependencias**: Fase 1  
**Skills**: whatsapp-automation, anti-ban-research.md

### Entregable
Un usuario puede escanear un QR, conectar su WhatsApp, y ver los mensajes que llegan en tiempo real.

### Qué incluye
- Backend: módulo WhatsApp con Baileys (multi-sesión)
- Backend: QR generation endpoint
- Backend: WebSocket (Socket.io) para enviar QR al frontend
- Backend: Webhook handler para mensajes entrantes
- Backend: Reconexión automática + manejo de desconexiones
- Frontend: página de conexión WhatsApp (mostrar QR, estado)
- Frontend: vista de chat en tiempo real (listado de conversaciones + mensajes)
- Base de datos: migraciones `whatsapp_sessions`, `messages`, `conversations`

### Criterio de éxito
```
1. Usuario va a Configuración > WhatsApp
2. Escanea QR con su teléfono
3. Estado cambia a "Conectado"
4. Envía un mensaje desde el teléfono a un contacto
5. El mensaje aparece en el chat del panel
```

### Skills a cargar

| Micro-agente | Skills |
|---|---|
| AG2-01, AG2-02, AG2-20, AG2-22, AG2-25 | `nestjs-best-practices` |
| AG2-10, AG2-13, AG2-15, AG2-17, AG2-47 | `whatsapp-automation` |
| AG2-18, AG2-43 | `websocket-development` |
| AG2-28, AG2-30, AG2-32, AG2-34, AG2-36, AG2-42 | `shadcn` |
| AG2-36, AG2-43 | `vercel-react-best-practices` |

### Estructura de agentes

```
6 Super-Agentes (zonas paralelas)
├── SA-1: DB + Entities         → 2 micro,  9 nano
├── SA-2: Baileys Engine        → 4 micro,  8 nano
├── SA-3: Backend API + WS      → 4 micro, 10 nano
├── SA-4: Frontend WhatsApp     → 2 micro,  6 nano
├── SA-5: Frontend Chat (Hooks) → 5 micro, 16 nano
├── SA-6: Anti-Ban + Tests      → 2 micro,  8 nano
└── Total: 19 micro-agentes, 57 nano-agentes
```

### Timeline
```
Batch 1: SA-1 DB + Research Baileys      → Día 1
Batch 2: SA-2 Baileys Engine             → Día 2-3
Batch 3: SA-3 API + WS + SA-4 Frontend   → Día 3-4
Batch 4: SA-5 Chat Components            → Día 4-5
Batch 5: SA-6 Anti-Ban + Tests + Build   → Día 5-6
```

---

## Fase 3 — CRM Básico 🗂️
**Duración estimada**: 4-5 días  
**Dependencias**: Fase 2 (los mensajes tienen contactos)  
**Skills**: crm-builder (patrones), shadcn

### Entregable
El usuario puede ver sus contactos, etiquetarlos, y ver el historial de conversaciones.

### Qué incluye
- Backend: CRUD contactos con búsqueda
- Backend: Tags (crear, asignar, filtrar)
- Backend: Notas en contactos
- Frontend: vista de contactos (tabla + búsqueda + filtros)
- Frontend: detalle de contacto (información + historial + notas)
- Frontend: tags con colores
- Populate automático de contactos desde WhatsApp (cuando llega un msj nuevo)

### Criterio de éxito
```
1. Al recibir un mensaje de WhatsApp, el contacto aparece en CRM
2. Puedo buscar contactos por nombre/teléfono
3. Puedo asignar tags y filtrar por ellas
4. Puedo ver el historial completo de mensajes con un contacto
```

### Skills a cargar
- **AG5**: crm-builder (patrones de CRM, adaptados)
- **AG9**: shadcn (tablas, cards, badges)

---

## Fase 4 — Pipeline de Ventas 📊
**Duración estimada**: 3-4 días  
**Dependencias**: Fase 3  
**Skills**: shadcn, web-design-guidelines

### Entregable
El usuario puede mover contactos a través de un pipeline Kanban, asignar vendedores, y gestionar oportunidades.

### Qué incluye
- Backend: CRUD pipelines + stages + deals
- Backend: Asignación a vendedores
- Backend: Movimiento entre etapas
- Frontend: Kanban drag & drop (usando dnd-kit o similar)
- Frontend: Deal detail (info + linked contact + timeline)
- Frontend: Calendario de recordatorios

### Criterio de éxito
```
1. Usuario ve pipeline con columnas (Lead → Negotiation → Won/Lost)
2. Arrastra un deal de una columna a otra
3. Asigna un contacto a un vendedor
4. Programa un recordatorio
```

### Skills a cargar
- **AG5**: shadcn
- **AG10**: web-design-guidelines (review UX)

---

## Fase 5 — Campañas Básicas 📨
**Duración estimada**: 5-6 días  
**Dependencias**: Fase 2 (necesita WhatsApp conectado)  
**Skills**: csv-excel-merger, bullmq-specialist, websocket-development

### Entregable
El usuario puede importar contactos desde Excel/CSV, crear una campaña con plantilla, programarla y ver resultados.

### Qué incluye
- Backend: CRUD campañas + templates + variables
- Backend: Importación CSV/Excel con validación
- Backend: Campaign Worker (BullMQ) con delays aleatorios
- Backend: Rate limiting por sesión WhatsApp
- Backend: Reportes en tiempo real (enviados, entregados, leídos, fallidos)
- Frontend: página de campañas (listado + crear + detalle)
- Frontend: editor de plantillas con variables `{{nombre}}`
- Frontend: reportes con gráficos

### Criterio de éxito
```
1. Usuario importa 100 contactos desde CSV
2. Crea una plantilla "Hola {{nombre}}..."
3. Programa campaña para "ahora"
4. Los mensajes se envían uno por uno con delays
5. El reporte muestra: 100 enviados, 95 entregados, 80 leídos, 2 fallidos
```

### Skills a cargar
- **AG6**: csv-excel-merger, bullmq-specialist
- **AG7**: websocket-development (reportes en tiempo real)
- **AG10**: shadcn

---

## Fase 6 — Automatizaciones 🤖
**Duración estimada**: 5-6 días  
**Dependencias**: Fase 3 + Fase 4 + Fase 5  
**Skills**: websocket-development, skill-creator

### Entregable
El usuario puede crear reglas automáticas: "si contacto dice 'precio', enviar plantilla X y cambiar etapa a Negotiation".

### Qué incluye
- Backend: CRUD automations + rules + actions
- Backend: Automation Worker (evalúa reglas en tiempo real)
- Backend: Tipos de triggers: keyword, incoming_message, deal_stage_change, scheduled
- Backend: Tipos de acciones: send_message, change_stage, add_tag, assign_agent, webhook
- Backend: Logs de ejecución
- Frontend: builder visual de automatizaciones (condiciones + acciones)
- Frontend: lista de ejecuciones con estado

### Criterio de éxito
```
1. Creo automatización: "si mensaje contiene 'precio' → enviar plantilla de precios"
2. Contacto escribe "cuánto cuesta"
3. Automatización se dispara → envía mensaje → queda logueado
```

### Skills a cargar
- **AG7**: websocket-development, skill-creator
- **AG10**: shadcn

---

## Fase 7 — Inteligencia Artificial 🧠
**Duración estimada**: 4-5 días  
**Dependencias**: Fase 3  
**Skills**: llm-integration

### Entregable
El usuario puede activar un agente IA que responde automáticamente a clientes, clasifica intenciones, y sugiere respuestas.

### Qué incluye
- Backend: módulo AI con provider OpenAI + Ollama
- Backend: Agente por empresa configurable (system prompt, modelo)
- Backend: Clasificación de intención del mensaje
- Backend: Respuestas sugeridas (no automáticas, sugeridas)
- Backend: Resumen de conversación
- Backend: Detección de "clientes calientes" (intención de compra)
- Frontend: configuración del agente IA
- Frontend: sugerencias en la vista de chat
- Frontend: documentos de entrenamiento (FAQ, PDF)

### Criterio de éxito
```
1. Usuario configura agente en settings
2. En un chat, el sistema sugiere: "Responde: Gracias por contactarnos..."
3. AI clasifica: "Intención: compra, Confianza: 87%"
4. AI detecta cliente caliente y lo marca
```

### Skills a cargar
- **AG8**: llm-integration

---

## Fase 8 — Campañas Avanzadas + Anti-Ban 🚀
**Duración estimada**: 5-6 días  
**Dependencias**: Fase 5 + Fase 6  
**Skills**: whatsapp-automation, anti-ban-research.md

### Entregable
Campañas con segmentación, A/B testing, flujos multi-paso, y motor anti-ban completo.

### Qué incluye
- Anti-ban v1: rate limiting inteligente por hora/día/antigüedad
- Anti-ban v2: pausas nocturnas, delays humanizados
- Anti-ban v3: monitoreo de salud con reducción automática
- Anti-ban v4: rotación entre sesiones
- Campañas multi-paso (secuencia de mensajes con delays entre pasos)
- Segmentación por tags, etapa del pipeline, actividad
- Reinteligencia de envío: si no entregado, reintentar en otro horario
- Dashboard anti-ban: estado de salud de cada sesión

### Criterio de éxito
```
1. Sesión WhatsApp se mantiene verde después de 500 mensajes/día
2. Si salud baja a "yellow", el sistema reduce envíos automáticamente
3. Campaña multi-paso: Día 1 → mensaje, Día 3 → seguimiento si no respondió
```

---

## Fase 9 — Admin + Multi-tenant 👑
**Duración estimada**: 3-4 días  
**Dependencias**: Fase 1  
**Skills**: api-authentication, shadcn

### Entregable
Panel de administración superadmin con gestión de empresas, usuarios, facturación y monitoreo.

### Qué incluye
- Frontend: panel admin con cambio de empresa (impersonate)
- Frontend: lista de empresas con estado, plan, uso
- Frontend: gestión de usuarios por empresa
- Frontend: métricas globales (cuentas activas, mensajes totales, etc.)
- Backend: endpoints admin (solo superadmin)
- Backend: logs de auditoría globales
- Facturación: webhooks de Conekta + gestión de suscripciones

### Criterio de éxito
```
Superadmin puede:
1. Ver todas las empresas y su estado
2. Cambiar plan de una empresa
3. Ver logs de actividad de cualquier empresa
4. Facturar manualmente
```

---

## Fase 10 — Producción + Documentación 📦
**Duración estimada**: 5-7 días  
**Dependencias**: Todas las fases anteriores  
**Skills**: web-design-guidelines, judgment-day

### Entregable
Sistema listo para producción con documentación completa, tests, y checklist de go-live.

### Qué incluye
- Tests: unitarios (Jest) + integración (supertest) + e2e (Playwright)
- Seguridad: rate limiting global, CORS, helmet, validación
- Documentación: API (Swagger/OpenAPI), deploy, FAQ
- Docker Compose producción (sin volúmenes de desarrollo)
- Scripts de backup automático (MySQL + MinIO)
- Monitoreo: Prometheus + Grafana (opcional)
- Judgment Day: revisión adversarial de TODO el código

### Criterio de éxito
```
✅ Judgment Day pasa (0 issues críticos)
✅ Tests pasan
✅ Documentación lista
✅ Docker compose producción funcional
✅ Backups probados
```

---

## 📊 Resumen de Dependencias

```
Fase 0 ──→ Fase 1 ──→ Fase 2 ──→ Fase 3 ──→ Fase 4
                  │          │          │
                  │          │          └──→ Fase 6 ←── Fase 7
                  │          │                     │
                  │          └──→ Fase 5 ──→ Fase 8
                  │
                  └──→ Fase 9 (puede ser en paralelo con 3-8)
                                      │
                  Fase 10 ←── todas ──┘
```

## 🧠 Asignación de Skills por Fase

| Fase | Skills |
|---|---|
| 0 | skill-creator, nestjs-best-practices, shadcn |
| 1 | nestjs-best-practices, api-authentication, shadcn |
| 2 | whatsapp-automation, anti-ban-research |
| 3 | crm-builder (patrones), shadcn |
| 4 | shadcn, web-design-guidelines |
| 5 | csv-excel-merger, bullmq-specialist, websocket-development |
| 6 | websocket-development, skill-creator |
| 7 | llm-integration |
| 8 | whatsapp-automation, anti-ban-research |
| 9 | api-authentication, shadcn |
| 10 | web-design-guidelines, judgment-day |
