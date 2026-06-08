# WhatsApp CRM + Automation + Campaigns

**Date:** 2026-06-07
**Status:** Design Approved
**Project:** Wisender Pro
**Stack:** Next.js 14.2.3, NestJS 10.3.0, TypeORM, MySQL, BullMQ, Baileys (WhatsApp)

---

## 1. Architecture Overview

```
WhatsApp (Baileys)
    │
    ├─ first_message ──────► Contact + Deal creados en Lead
    │
    ├─ label_added ────────► Label Sync Service
    │                            │
    │                            ├── Sincroniza label al CRM Contact
    │                            ├── Evalúa Label Mappings (etiqueta→etapa)
    │                            │      └── match → mueve deal
    │                            └── Evalúa Automation Rules
    │                                   └── match → ejecuta acción
    │
    └─ (acciones programadas)
           │
           ▼
    [BullMQ Worker] ──► Automation Engine
                            │
                            ├── deal.stage_changed → evalúa reglas
                            └── match → ejecuta acción (campaign, etc.)
```

### Core services

| Service | Responsibility |
|---|---|
| **Automation Engine** | Evalúa reglas en eventos, ejecuta acciones |
| **Label Sync Service** | Sincroniza etiquetas WhatsApp → CRM, dispara mapeos |
| **Campaign Trigger** | Asocia campañas a etapas del pipeline |
| **Auto Deal Creator** | Crea contacto + deal al recibir primer mensaje |

---

## 2. Pipeline / Embudo de Ventas

### Stages

```
Lead → Calificado → Propuesta → Negociación → Ganado / Perdido
```

### Automatic behavior on first message

1. Número desconocido escribe por WhatsApp
2. Se crea **Contact** en CRM (nombre del perfil WA si existe, sino "WA + número")
3. Se crea **Deal** automáticamente:
   - `name`: "Deal de [contact name]"
   - `source`: "whatsapp"
   - `pipeline_stage_id`: Lead stage
   - `linked_contact_id`: el contacto creado
   - `value`: 0
   - `triggered_by_automation`: true
4. Se dispara evento `whatsapp.first_message` → el motor de automatización evalúa reglas

### Label → Stage mappings (separado de reglas generales)

Configuración directa en tabla `whatsapp_label_mappings`:

| WhatsApp Label | Pipeline Stage |
|---|---|
| `interesado` / `calificado` | Calificado |
| `presupuesto` / `propuesta` | Propuesta |
| `negociando` | Negociación |
| `ganado` / `cliente` | Ganado |
| `perdido` / `no-interesado` | Perdido |

El usuario puede crear/editar/eliminar mapeos desde la UI. Esto es independiente del motor de reglas general.

---

## 3. Label Sync (WhatsApp → CRM)

### Flow

1. Baileys detecta `label_added` o `label_removed` en un contacto
2. El gateway de WhatsApp emite evento interno
3. **Label Sync Service**:
   - Busca contacto en CRM por WA ID
   - Si no existe → lo crea con datos mínimos
   - Agrega/quita la label en el array `whatsapp_labels` del contacto
   - Emite evento `whatsapp.label_added` o `whatsapp.label_removed`
4. El **Automation Engine** recibe el evento:
   - Primero evalúa **Label Mappings** (mapeo directo etiqueta→etapa)
   - Si hay match → mueve el deal a la etapa correspondiente
   - Luego evalúa **Automation Rules** generales (acciones adicionales)

### Direction

- **Unidireccional**: WhatsApp → CRM
- Las labels de WhatsApp NO se escriben de vuelta a WhatsApp

---

## 4. Automation Engine

### Events

| Event | Trigger | Payload |
|---|---|---|
| `whatsapp.first_message` | Primer mensaje de un número nuevo | `{ contact_id, wa_id }` |
| `whatsapp.label_added` | Etiqueta aplicada en WA | `{ contact_id, label_name, wa_id }` |
| `whatsapp.label_removed` | Etiqueta quitada en WA | `{ contact_id, label_name, wa_id }` |
| `deal.stage_changed` | Deal movió de etapa | `{ deal_id, from_stage_id, to_stage_id }` |
| `deal.won` | Deal marcado como Ganado | `{ deal_id, stage_id }` |
| `deal.lost` | Deal marcado como Perdido | `{ deal_id, stage_id, reason }` |

### Actions

| Action | Params | Behavior |
|---|---|---|
| `pipeline.move` | `{ stage_id }` | Mueve el deal asociado a la etapa indicada |
| `campaign.trigger` | `{ campaign_id }` | Dispara una campaña para este contacto |
| `contact.add_label` | `{ label_id }` | Agrega una label del CRM al contacto |
| `contact.assign` | `{ user_id }` | Asigna el contacto a un usuario/vendedor |

### Rule model

Each rule is: `WHEN [event] IF [conditions] THEN [action]`

Conditions are optional JSON filters. Example:

```json
{
  "name": "Mover a Calificado por etiqueta",
  "event": "whatsapp.label_added",
  "conditions": { "label_name": "interesado" },
  "action": {
    "type": "pipeline.move",
    "params": { "stage_id": "<calificado-uuid>" }
  },
  "enabled": true
}
```

Rules are evaluated by a BullMQ worker for async processing.

---

## 5. Campaigns + Pipeline Integration

### Auto-triggered campaigns

A campaign can be configured with a `trigger_event`:

```json
{
  "type": "deal.stage_changed",
  "stage_id": "uuid-de-propuesta"
}
```

When a deal enters that stage:
1. Automation Engine detects `deal.stage_changed`
2. Evalúa si alguna regla tiene acción `campaign.trigger` con esa campaign
3. La campaña se ejecuta para ese contacto (no masiva — individual)

### Segmentation for manual campaigns

When creating/sending a campaign manually, the user can filter contacts by:

- **WhatsApp label**: selección de una o más etiquetas sincronizadas (ej: todos los contactos con label "interesado")
- **Pipeline stage**: contactos cuyo deal está en una etapa específica
- **Combinado**: etiqueta + etapa + otros criterios (fecha de último contacto, etc.)

The existing campaign flow (create → select template → schedule → send) remains unchanged. Only the contact targeting gets enhanced.

---

## 6. Data Model

### New tables

#### `automation_rules`

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK → companies | Tenant isolation |
| name | VARCHAR(200) | Human-readable name |
| event | ENUM | `whatsapp.first_message`, `whatsapp.label_added`, `whatsapp.label_removed`, `deal.stage_changed`, `deal.won`, `deal.lost` |
| conditions | JSON | Optional filter (e.g., `{ "label_name": "..." }`) |
| action | JSON | `{ type, params }` |
| enabled | BOOLEAN | Default: true |
| created_at | DATETIME | |
| updated_at | DATETIME | |

#### `whatsapp_label_mappings`

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK → companies | Tenant isolation |
| whatsapp_label | VARCHAR(100) | Exact label name from WhatsApp |
| pipeline_stage_id | UUID FK → pipeline_stages | Stage to move deals to |
| enabled | BOOLEAN | Default: true |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### Modified tables

#### `contacts`

| New Column | Type | Description |
|---|---|---|
| whatsapp_labels | JSON | Array of label names synced from WA |
| wa_id | VARCHAR(100) | WhatsApp ID for matching (may already exist) |

#### `deals`

| New Column | Type | Description |
|---|---|---|
| triggered_by_automation | BOOLEAN | Default: false. True if auto-created by first_message |

#### `campaigns`

| New Column | Type | Description |
|---|---|---|
| trigger_event | JSON | Nullable. `{ type: "deal.stage_changed", stage_id: "..." }` |

---

## 7. API Endpoints

### Automation Rules (new module)

```
GET    /api/crm/automation-rules?company_id=X
POST   /api/crm/automation-rules
PUT    /api/crm/automation-rules/:id
DELETE /api/crm/automation-rules/:id
PATCH  /api/crm/automation-rules/:id/toggle  → { enabled: boolean }
```

### WhatsApp Label Mappings (new module)

```
GET    /api/crm/label-mappings?company_id=X
POST   /api/crm/label-mappings
PUT    /api/crm/label-mappings/:id
DELETE /api/crm/label-mappings/:id
```

### Campaigns (modified)

```
PUT    /api/campaigns/:id/trigger → { trigger_event }
```

### Internal webhook

```
POST /api/internal/whatsapp-event
Body: {
  type: "label_added" | "label_removed" | "first_message",
  wa_id: string,
  label_name?: string
}
```

This endpoint is called by the WhatsApp gateway, NOT exposed publicly.

---

## 8. Frontend / UI

### CRM > Automation (existing route)

Two tabs:

#### Tab: "Reglas" (Rules)
- Table with columns: Name, Event, Action, Status (toggle), Created
- "Nueva regla" button → modal with:
  - Event selector (dropdown: first_message, label_added, etc.)
  - Conditions (dynamic form based on event — e.g., label_name input for label_added)
  - Action selector + params (stage picker for pipeline.move, campaign picker for campaign.trigger)
  - Toggle enabled
- Inline toggle for enabled/disabled
- Delete with confirmation

#### Tab: "Etiquetas" (Label Mappings)
- Table: WhatsApp Label → Pipeline Stage → Status
- "Nuevo mapeo" button → modal with:
  - Input: label name (exact match from WhatsApp)
  - Select: pipeline stage
  - Toggle enabled

### Campaigns > Auto-trigger

On campaign edit/detail page:
- Toggle: "Disparar automáticamente"
- When on: selector "Cuando un deal llegue a la etapa..."
- Saves via `PUT /api/campaigns/:id/trigger`

### Pipeline > Visual indicators

- Deals created by automation show a small WhatsApp badge/badge in the Kanban card
- On hover/tooltip: "Creado automáticamente desde WhatsApp"
- Deal moved by label mapping shows tooltip: "Movido por etiqueta: [label]"

### Quick-add and empty states

- Pipeline empty state: "Conectá WhatsApp para empezar a recibir leads automáticamente"
- Contacts page shows synced WhatsApp labels as tags on each row

---

## 9. Execution Plan (Ordered)

### Phase 1: Foundation (Backend)

1. Create `automation_rules` table and NestJS module (controller, service, entity)
2. Create `whatsapp_label_mappings` table and NestJS module
3. Add `whatsapp_labels` column to `contacts` entity
4. Add `triggered_by_automation` column to `deals` entity
5. Add `trigger_event` column to `campaigns` entity

### Phase 2: Sync & Automation Engine (Backend)

6. Implement **Label Sync Service**: escucha eventos de Baileys, sincroniza labels al contacto
7. Implement **Automation Engine**: evalúa eventos contra reglas y mapeos, ejecuta acciones
8. Implement **Auto Deal Creator**: primer mensaje → crea contacto + deal
9. Internal webhook endpoint `POST /api/internal/whatsapp-event`
10. Wire Baileys events to internal webhook

### Phase 3: Campaign Integration (Backend)

11. Modify campaign service: evaluar `trigger_event` al detectar cambio de etapa
12. Expose `PUT /api/campaigns/:id/trigger`
13. BullMQ worker for async rule evaluation

### Phase 4: Frontend

14. CRM > Automation > Rules tab (list + create/edit/toggle)
15. CRM > Automation > Labels tab (list + create/edit/delete)
16. Campaign auto-trigger toggle in campaign form
17. Pipeline visual indicators (WhatsApp badge, automation tooltips)

### Phase 5: Polish

18. Empty states, loading states, error handling
19. Tests (backend unit + frontend component)
20. Seed data for default label mappings

---

## 10. Existing Code That Stays Unchanged

- Pipeline Kanban board (drag & drop)
- Contacts list/detail
- Deal manual creation flow
- Campaign send flow (mass send)
- WhatsApp connection / session management
- Calendar, schedule, labels pages
- Authentication, tenancy, multi-company isolation
