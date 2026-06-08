# CRM Pipeline — Architecture Record

## Created: 2026-05-28

### Components Created

| Component | Path | Purpose |
|-----------|------|---------|
| Pipeline Types | `types/crm.ts` | Stage definitions, constants, colors |
| API Layer | `lib/crm-api.ts` | Fetch functions for pipeline, contacts, activities |
| CRM Store | `stores/crm-store.ts` | Zustand store with optimistic updates + event bus |
| KanbanBoard | `components/crm/pipeline/kanban-board.tsx` | DndContext wrapper, drag/drop orchestration |
| KanbanColumn | `components/crm/pipeline/kanban-column.tsx` | Droppable column per stage |
| LeadCard | `components/crm/pipeline/lead-card.tsx` | Draggable lead card with constructivist style |
| LeadDetailDialog | `components/crm/pipeline/lead-detail-dialog.tsx` | Modal with contact info + activity timeline |
| ActivityTimeline | `components/crm/pipeline/activity-timeline.tsx` | Timeline component for activities |
| NewLeadDialog | `components/crm/pipeline/new-lead-dialog.tsx` | Form to create leads (manual or from WhatsApp) |
| Pipeline Page | `app/(dashboard)/crm/pipeline/page.tsx` | Main pipeline page with stats + kanban |
| UI: Dialog | `components/ui/dialog.tsx` | Missing shadcn dialog component |
| UI: Select | `components/ui/select.tsx` | Missing shadcn select component |

### Modified
| File | Change |
|------|--------|
| `components/layouts/dashboard-shell.tsx` | Added 'use client', dynamic active state via usePathname, CRM nav item |

### Communication
- **Store:** `useCRMStore` (Zustand) — shared state for pipeline leads
- **Events:** `lead:moved`, `lead:created`, `lead:updated` — for cross-agent integration
- **API:** `lib/crm-api.ts` — fetch to NestJS backend

### Style
- Constructivist design: `geometric-frame`, `card-constructivist`, `divider-constructivist`
- Colors: Primary red (#8B0000), Secondary ochre (#CC7722)
- Fonts: PT Sans (body), Merriweather (headings)
- Borders: rounded-sm (angular), constructivist shadows

### Next Steps (Fase 2)
- Calendar view (monthly/weekly) for activities
- Automation rules (stage-based + time-based triggers)
- Scheduled message sending from calendar
