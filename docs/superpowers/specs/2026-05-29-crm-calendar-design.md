# CRM Calendar — Design Doc

## Overview
Add a professional calendar view (Google Calendar-style) to the CRM, turning the existing flat activity list into a visual agenda for client follow-ups.

## Model Changes

### Activity (entity)
```sql
-- New fields on `activities` table
completed_at datetime?    -- set when a task is marked done
completed_by uuid?        -- FK → users.id
```

- `type = 'task'` se crea siempre con `completed_at = NULL` (pendiente)
- Los demás tipos (call, meeting, email, note, whatsapp, system) se dejan como están
- `activity_date` es la fecha del evento en el calendario

### ActivityType
No cambia. Se usa el enum existente: `call | email | meeting | note | task | whatsapp | system`.

## Backend Endpoints

### `GET /crm/activities/calendar?from=2026-05-01&to=2026-06-30`
Reemplaza el limit fijo por un rango de fechas. Devuelve:
```ts
{
  id: string;
  type: ActivityType;
  description: string;
  activity_date: string; // ISO
  completed_at: string | null;
  contact_id: string | null;
  contact_name: string | null;
  deal_id: string | null;
  deal_name: string | null;
  logged_by: string;
}
```

### `PATCH /crm/activities/:id/complete`
Body: vacío.
- Setea `completed_at = now()` y `completed_by = userId`
- Idempotente (si ya está completada, no hace nada)
- Devuelve la actividad actualizada

### `PATCH /crm/activities/:id` (drag & drop)
Body: `{ activity_date: "2026-05-30T14:00:00Z" }`
- Actualiza solo la fecha (usado por drag & drop en el calendario)
- Devuelve la actividad actualizada

### `POST /crm/activities` + `DELETE /crm/activities/:id`
Ya existen. No se modifican.

## Frontend — Calendario

### Ruta
`/crm/calendar` — nuevo item en el sidebar del CRM, entre Activities y Labels.

### Librería
**FullCalendar** (`@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`).
- Vista por defecto: `dayGridMonth`
- Botones para cambiar a semana (`dayGridWeek`) y día (`dayGridDay`)
- Click en día vacío → modal `ActivityForm` con fecha pre-seleccionada
- Click en evento → modal de detalle con opciones

### Colores por tipo de actividad
```
task      → amber (#d97706) — pendiente: borde punteado, completada: sólido tachado
call      → green (#16a34a)
meeting   → blue (#2563eb)
email     → purple (#9333ea)
note      → gray (#6b7280)
whatsapp  → emerald (#059669)
system    → slate (#475569)
```

### Filtros
Toggle arriba del calendario:
```
[ Todos ] [ Solo tareas pendientes ]
```
"Solo tareas pendientes" filtra solo `type = 'task'` con `completed_at = null`.

### Modal de detalle de evento
```
[Ícono y tipo] [Descripción]
[Contacto] [Negocio]
[Fecha y hora]
--- 
[ Marcar completada ] [ Editar ] [ Eliminar ]
```
- Si ya está completada: muestra check verde + fecha de completado, el botón dice "Desmarcar"
- Editar abre `ActivityForm` con datos precargados
- Eliminar pide confirmación

### Drag & Drop
- Arrastrar un evento lo mueve en el calendario (visual instantáneo)
- Al soltar: `PATCH /crm/activities/:id` con nueva fecha
- Si falla: se revierte la posición visual y muestra error toast

### Responsive
- Mobile: vista `dayGridDay` por defecto (una semana ocupa mucho espacio)
- Desktop: `dayGridMonth` con opción a semana

## Implementation Order

1. **Modelo**: migration + entity fields (`completed_at`, `completed_by`)
2. **Endpoints**: calendar query, complete, drag & drop update
3. **Calendario UI**: instalar FullCalendar, crear CalendarView + CalendarPage
4. **Modales**: ActivityForm adaptado, detail modal, complete action
5. **Sidebar**: agregar ruta `/crm/calendar`
6. **Drag & drop**: integración con endpoint
7. **Filtro pendientes**: toggle state + re-fetch condicional

## Scope Exclusion
- Notificaciones/recordatorios push (futuro)
- Integración con Google Calendar / Outlook (futuro)
- Eventos recurrentes (futuro)
- Asignación de tareas a múltiples usuarios (futuro)
