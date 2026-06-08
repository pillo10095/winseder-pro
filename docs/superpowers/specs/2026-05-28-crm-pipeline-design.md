# CRM Pipeline + Calendario — Wisender Pro

## Resumen

CRM embebido en Wisender Pro que convierte contactos de WhatsApp en leads,
los gestiona mediante un pipeline Kanban, y permite programar citas y
mensajes automáticos desde un calendario.

## Stack

- **Frontend:** Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Estado:** Zustand + Server State (fetch directo a API)
- **Drag & Drop:** @dnd-kit
- **Estilo:** Constructivismo Literário Experimental (rojo/ocre, sombras angulares)
- **API Backend:** NestJS (ya existente en `apps/api`)

## Pipeline Kanban

### Columnas (etapas)

| Etapa          | Clave          | Color  |
|----------------|----------------|--------|
| Lead Nuevo     | `lead_nuevo`   | Gris   |
| Calificado     | `calificado`   | Azul   |
| Cita Agendada  | `cita_agendada`| Violeta|
| Negociación    | `negociacion`  | Ámbar  |
| Cerrado Ganado | `cerrado_ganado`| Verde  |
| Cerrado Perdido| `cerrado_perdido`| Rojo  |

### Lead card

Cada tarjeta muestra:
- Nombre del contacto + badge de origen (WhatsApp, web, referido)
- Teléfono (link directo a chat de WhatsApp)
- Producto/servicio de interés
- Valor estimado (formateado en ARS)
- Última actividad (días desde último contacto)
- Avatar del vendedor asignado

### Comportamiento

- Drag & drop entre columnas (actualiza etapa vía API)
- Click en card → detalle del lead con timeline de actividades
- Botón "Nuevo Lead" → modal para crear manualmente o importar de WhatsApp
- Los leads pueden crearse directamente desde una conversación de WhatsApp

## Calendario / Actividades

### Vistas
- **Vista mensual** — visión general del mes
- **Vista semanal** — desglose por día/semana

### Tipos de eventos
1. **Citas** — test drives, reuniones, llamadas programadas
2. **Mensajes programados** — envío automático en fecha/hora específica
3. **Reglas automáticas** — disparadores visibles en el calendario

### Reglas de automatización
- Disparadores por etapa: "al llegar a etapa X → enviar plantilla Y"
- Disparadores por tiempo: "si pasaron N días sin actividad → enviar recordatorio"
- Configurables desde el calendario (toggle on/off, editar plantilla)

## Estilo constructivista

Aplica los mismos patrones que el resto de Wisender Pro:
- `geometric-frame` en sidebar y cards principales
- `divider-constructivist` como separadores
- Sombras `constructivist` / `constructivist-hover`
- Esquinas `rounded-sm` (angulares)
- Paleta: primary rojo oscuro, secondary ocre
- Tipografía: PT Sans (body), Merriweather (headings)

## Archivos a crear

### Pipeline
- `app/(dashboard)/crm/pipeline/page.tsx` — Kanban board
- `components/crm/pipeline/kanban-board.tsx` — Board con columnas
- `components/crm/pipeline/kanban-column.tsx` — Columna individual
- `components/crm/pipeline/lead-card.tsx` — Tarjeta de lead
- `components/crm/pipeline/lead-detail-dialog.tsx` — Modal detalle

### Calendario
- `app/(dashboard)/crm/activities/page.tsx` — Página calendario
- `components/crm/activities/calendar-view.tsx` — Calendario (mensual/semanal)
- `components/crm/activities/event-form-dialog.tsx` — Crear/editar evento
- `components/crm/activities/automation-rule-card.tsx` — Regla de automatización

### Shared
- `stores/crm-store.ts` — Estado global del CRM
- `lib/crm-api.ts` — Funciones de fetch a API CRM

## API endpoints existentes a usar

- `GET /crm/pipeline` — datos del pipeline
- `PATCH /crm/pipeline/:id` — mover lead de etapa
- `GET /crm/contacts` — contactos
- `GET /crm/activities` — actividades
- `POST /crm/activities` — crear actividad
- `POST /whatsapp/sessions/:id/messages` — enviar mensaje
- `GET /chatbot/automation-rule` — reglas de automatización
