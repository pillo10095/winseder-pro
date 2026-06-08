# Design: CRM Pipeline — Fase 1 (Premium)

## 1. Goal

Transformar el pipeline de CRM existente en wisender-pro (apps/api + apps/web) en un Kanban de nivel enterprise con UX/UI avanzada. Extender backend, rediseñar componentes frontend, agregar filtros combinados, timeline de actividades, y stats en tiempo real.

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 14)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │KanbanBoard│ │LeadDetail│ │NewLead   │ │PipelineStats │ │
│  │ (dnd-kit) │ │ (Dialog) │ │ (Dialog) │ │   (Header)  │ │
│  └─────┬─────┘ └─────┬────┘ └────┬─────┘ └──────┬──────┘ │
│        └──────────────┴──────────┴───────────────┘        │
│                   useCRMStore (Zustand)                    │
│               optimistic updates + rollback                │
└───────────────────────────┬───────────────────────────────┘
                            │ fetch / PATCH / POST
┌───────────────────────────┼───────────────────────────────┐
│               NestJS API  │                               │
│  ┌────────────────────────┴──────────────────────────┐    │
│  │              PipelineController                     │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  GET /crm/pipeline?stage=&search=&label=&assigned= │   │
│  │  PATCH /crm/pipeline/:id   (mover etapa)           │   │
│  │  GET /crm/pipeline/:id    (detail + activities)     │   │
│  │  POST /crm/pipeline       (crear lead)              │   │
│  │  GET /crm/pipeline/stats  (KPIs)                    │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  PipelineService → DealRepository + ActivityRepo    │   │
│  │  + ContactService + LabelRepository                  │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Stack
- **Frontend:** Next.js 14 App Router, dnd-kit, Zustand, shadcn/ui, Lucide icons, date-fns
- **Backend:** NestJS 10, TypeORM, MySQL 8
- **Real-time:** WebSocket (Socket.io) para notificaciones de nuevos leads desde WhatsApp

## 3. Data Model (Extensiones)

### Deal (entidad existente — extensiones)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| *id, company_id, pipeline_stage_id, contact_id, name, value, company_name, probability, close_date, assigned_to, won_lost_reason, created_at, updated_at* | *Existente* | |
| **tags** | `text[]` (simple-array) | Tags rápidos: VIP, Caliente, Frío, etc. |
| **last_activity_at** | `datetime` | Para ordenar cards por actividad reciente |
| **next_action** | `varchar(200)` | Próxima acción planeada |
| **next_action_date** | `datetime` | Fecha de próxima acción |

### Activity (extensión de tipos existentes)

```typescript
export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  WHATSAPP = 'whatsapp',     // Nueva
  SYSTEM = 'system',          // Nueva: cambio de etapa
}
```

## 4. API Endpoints

### Pipeline

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|-------------|
| `GET` | `/crm/pipeline` | Listar leads | `stage`, `search`, `label`, `assigned`, `source`, `page`, `limit` |
| `GET` | `/crm/pipeline/:id` | Lead detail + actividades | |
| `POST` | `/crm/pipeline` | Crear lead | Body: `{name, phone, email, source, product, value, notes}` |
| `PATCH` | `/crm/pipeline/:id` | Actualizar (mover etapa, editar) | |
| `DELETE` | `/crm/pipeline/:id` | Eliminar | |
| `GET` | `/crm/pipeline/stats` | KPIs del pipeline | `period` (1m, 3m, 1y) |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/crm/pipeline/:id/activities` | Timeline de actividades |
| `POST` | `/crm/pipeline/:id/activities` | Crear actividad en un lead |

## 5. Frontend Components

### 5.1 PipelineHeader
- KPIs: Total pipeline value, total leads, avg ticket size, conversion rate
- Filtros combinados: origen (dropdown), etapa, asignado, búsqueda textual
- Botón "Nuevo Lead" que abre NewLeadDialog

### 5.2 KanbanBoard
- DndContext de dnd-kit con PointerSensor (activación a 8px)
- Scroll horizontal con overflow-x-auto
- DragOverlay con card escalada + rotación sutil + sombra
- Columnas con scroll vertical interno independiente

### 5.3 KanbanColumn
- Header con nombre de etapa, color, count de leads
- Área droppable con highlight on hover
- Botón "+" al final para crear lead/contacto
- Lista scrollable de LeadCards

### 5.4 LeadCard
- Avatar con iniciales + color generado del nombre
- Nombre, descripción/cargo
- Valor del deal formateado
- Badge de origen con color (WhatsApp verde, Web azul, Facebook azul, etc.)
- Timestamp relativo de última actividad
- Labels como pills de colores
- Acciones rápidas: llamar, email, calendar (íconos)

### 5.5 LeadDetailDialog
- Modal (shadcn Dialog) con 4 tabs:
  - **Info:** Datos del lead, labels, asignado, notas editables
  - **Actividades:** Timeline vertical cronológico con actividades agrupadas por día
  - **WhatsApp:** Chat embebido (solo si origen === 'whatsapp')
  - **Archivos:** Documentos asociados

### 5.6 NewLeadDialog
- Formulario: nombre, teléfono, email, origen, producto interés, valor, notas
- Opción "Crear también como contacto"
- Auto-asignar al usuario actual

## 6. State Management

```typescript
// useCRMStore (Zustand) — Estrategia optimistic update
interface CRMState {
  leads: Deal[];
  stats: PipelineStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  loadLeads: (filters?: PipelineFilters) => Promise<void>;
  loadStats: (period?: string) => Promise<void>;
  moveLead: (dealId: string, newStageId: string) => Promise<void>;
  createLead: (dto: CreateDealDto) => Promise<void>;
  updateLead: (dealId: string, dto: Partial<Deal>) => Promise<void>;
}
```

**Optimistic update flow:**
```
moveLead(id, newStage)
  → actualizar estado local INMEDIATAMENTE
  → PATCH /crm/pipeline/:id
  → si falla → ROLLBACK al estado anterior
  → si ok → mantener nuevo estado
```

## 7. UI/UX Design System

### Colores por etapa
| Etapa | Color | Badge |
|-------|-------|-------|
| Lead Nuevo | Gray (#6B7280) | bg-gray-100 text-gray-800 |
| Calificado | Blue (#3B82F6) | bg-blue-100 text-blue-800 |
| Cita Agendada | Purple (#8B5CF6) | bg-purple-100 text-purple-800 |
| Negociación | Amber (#F59E0B) | bg-amber-100 text-amber-800 |
| Cerrado Ganado | Green (#22C55E) | bg-green-100 text-green-800 |
| Cerrado Perdido | Red (#EF4444) | bg-red-100 text-red-800 |

### Colores por origen
| Origen | Badge Class |
|--------|-------------|
| WhatsApp | bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 |
| Web | bg-blue-100 text-blue-800 |
| Facebook | bg-indigo-100 text-indigo-800 |
| Instagram | bg-pink-100 text-pink-800 |
| Referido | bg-purple-100 text-purple-800 |
| Presencial | bg-amber-100 text-amber-800 |
| Manual | bg-gray-100 text-gray-800 |

### Constructivist touches
- Sombras angulares (shadow-constructivist)
- Bordes rounded-sm (no redondeados)
- Tipografía: PT Sans body, Merriweather headings
- Paleta: Primary red (#8B0000), Secondary ochre (#CC7722)
- Separadores gruesos estilo constructivista

## 8. Files to Change

### Modified (backend)
| File | Change |
|------|--------|
| `apps/api/src/modules/crm/entities/deal.entity.ts` | Add tags, last_activity_at, next_action, next_action_date |
| `apps/api/src/modules/crm/entities/activity.entity.ts` | Add WHATSAPP, SYSTEM types |
| `apps/api/src/modules/crm/services/deal.service.ts` | Add findWithFilters, moveStage, getStats |
| `apps/api/src/modules/crm/services/activity.service.ts` | Auto-create system activities on stage change |
| `apps/api/src/modules/crm/controllers/pipeline.controller.ts` | Refactor with filters, stats endpoint |
| `apps/api/src/modules/crm/controllers/deal.controller.ts` | Align with new service methods |

### New (backend)
| File | Description |
|------|-------------|
| `apps/api/src/modules/crm/dto/query-pipeline.dto.ts` | Validation for query params |
| `apps/api/src/modules/crm/dto/move-deal.dto.ts` | Validation for move-stage |

### Modified (frontend)
| File | Change |
|------|--------|
| `stores/crm-store.ts` | Full refactor: filters, optimistic updates, rollback |
| `lib/crm-api.ts` | Add stats endpoint, filters, activities |
| `types/crm.ts` | Align types with backend |
| `components/crm/crm-nav.tsx` | Maybe minor UX tweaks |

### New (frontend)
| File | Description |
|------|-------------|
| `components/crm/pipeline/pipeline-header.tsx` | KPIs + filters bar |
| `components/crm/pipeline/pipeline-stats.tsx` | Stats cards with animations |
| `components/crm/pipeline/lead-card.tsx` | Redesigned card (avatar, badges, actions) |
| `components/crm/pipeline/kanban-board.tsx` | Refactored with better drag UX |
| `components/crm/pipeline/kanban-column.tsx` | Refactored with scroll, count, add button |
| `components/crm/pipeline/lead-detail-dialog.tsx` | Full modal with tabs |
| `components/crm/pipeline/activity-timeline.tsx` | Enhanced timeline |
| `components/crm/pipeline/new-lead-dialog.tsx` | Lead creation form |

## 9. No-Go / Out of Scope

- **WebSocket real-time push** de nuevos leads → postergado a Fase 3
- **Automatizaciones** (stage triggers) → Fase 3
- **Chat WhatsApp embebido** real en LeadDetail → Fase 3
- **Responsive mobile completo** → Fase 4
- **Dark mode** → Fase 4
- **Keyboard shortcuts** → Fase 4

## 10. Testing Strategy

- **Unit:** PipelineService.findWithFilters, PipelineService.moveStage, store optimistic update logic
- **Integration:** PipelineController endpoints (GET, PATCH, POST, DELETE)
- **Frontend:** KanbanBoard drag & drop flow, LeadDetailDialog open/close, filters interaction
- **Coverage target:** >80% on new/modified code
