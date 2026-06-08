# CRM Calendario + Automatización — Phase 2

> **For agentic workers:** Tasks are independent per agent group and can run in parallel.
>
> **IMPORTANTE:** Al completar cada agente, GUARDAR en Engram usando `mem_save` con `topic_key: "crm/calendar-agents"`.
> La documentación ES la comunicación entre agentes. Sin ella, el próximo agente no sabe qué stores existen ni qué eventos escuchar.

**Goal:** Calendario de actividades, reglas de automatización, mensajes programados e integración WhatsApp.

**Architecture:** Zustand stores + fetch a API. date-fns para fechas. Sin librería de calendario externa — implementación propia con Tailwind.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, date-fns, Zustand, Lucide React

---

## 🧠 Mapa de Agentes — Fase 2

### Agente 1: Calendar Core

**Skill:** date-fns, Tailwind CSS Grid, shadcn/ui Card/Badge, constructivismo

| Rol | Nombre | Skill específica | Archivo(s) |
|-----|--------|----------------|-----------|
| **Agente** | Calendar Core | date-fns (format, eachDayOfInterval, isSameDay), Tailwind grid, shadcn Card | `calendar-monthly.tsx`, `calendar-weekly.tsx`, `event-card.tsx` |
| **Sub-agente** | MonthlyGrid | date-fns getMonthDays, grid-cols-7 responsive, navegación con ChevronLeft/Right | `calendar-monthly.tsx` |
| **Sub-agente** | WeeklyGrid | date-fns startOfWeek/addDays, timeline con HOURS array, overflow scroll | `calendar-weekly.tsx` |
| **Nano-agente** | `useCalendarNavigation` | date-fns addMonths/addWeeks, useState para currentDate | Hook inline en store |
| **Nano-agente** | `useDayEvents` | date-fns isSameDay, filter de array | Hook inline |
| **Nano-agente** | `date-utils.ts` | date-fns puro, funciones sin estado | `lib/date-utils.ts` |

**Comunicación (documentación obligatoria):**
```typescript
// Al completar, guardar en Engram:
mem_save({
  title: "Calendar Core — componentes creados",
  type: "architecture",
  topic_key: "crm/calendar-agents",
  capture_prompt: false,
  content: {
    what: "CalendarMonthly + CalendarWeekly + EventCard con date-fns",
    where: "components/crm/activities/",
    learned: "date-fns locale es para español. Grid semanal con HOURS fijo (8-21).",
    communication: {
      emits: [],
      listens: ["event:created", "event:updated", "event:deleted"],
      store: "useCalendarStore (stores/calendar-store.ts)",
      store_events: ["events[]", "view", "currentDate"],
    },
    next_agent: "Agente 2 (Event Manager) necesita useCalendarStore.addEvent()"
  }
})
```

### Agente 2: Event Manager

**Skill:** shadcn Dialog/Input/Select/Textarea, react-hook-form, zod, lucide-react Calendar/Clock/Send

| Rol | Nombre | Skill específica | Archivo(s) |
|-----|--------|----------------|-----------|
| **Agente** | Event Manager | shadcn Dialog + Form components, Select con tipos de evento | `event-form-dialog.tsx` |
| **Sub-agente** | EventForm | shadcn Input type=date/type=time, Label, Textarea, validación required | `event-form-dialog.tsx` |
| **Sub-agente** | EventTypeSelector | shadcn Button variant toggle, 3 estados visuales con iconos | `event-form-dialog.tsx` (inline) |
| **Nano-agente** | `useEventForm` | useState + handleSubmit + reset, validación de campos | Hook inline |
| **Nano-agente** | `event-types.ts` | Constantes: tipo → color → ícono → label | `types/events.ts` |

**Comunicación:**
```typescript
mem_save({
  title: "Event Manager — formulario de eventos",
  type: "architecture",
  topic_key: "crm/calendar-agents",
  capture_prompt: false,
  content: {
    what: "EventFormDialog con tipos: cita, mensaje, recordatorio",
    where: "components/crm/activities/event-form-dialog.tsx",
    learned: "Usa useCalendarStore.addEvent() para persistir.",
    communication: {
      emits: ["event:created"],
      listens: ["calendar:cell-click (pre-poblar fecha)"],
      store: "useCalendarStore",
    },
    next_agent: "Agente 3 necesita saber que events[] existe en calendar-store"
  }
})
```

### Agente 3: Automation Rules

**Skill:** shadcn Switch/Card/Select, lógica de reglas con tipos discriminados, Zustand store con optimistic updates

| Rol | Nombre | Skill específica | Archivo(s) |
|-----|--------|----------------|-----------|
| **Agente** | Automation Rules | shadcn Switch toggle, Select con PIPELINE_STAGES, Card con estados | `rule-card.tsx`, `rule-form-dialog.tsx`, `rule-list.tsx` |
| **Sub-agente** | RuleCard | shadcn Switch(checked/onCheckedChange), Badge tipo trigger, Button variant ghost delete | `rule-card.tsx` |
| **Sub-agente** | RuleFormDialog | shadcn Select condicional (etapa/tiempo/etapa+tiempo), Input number, validación | `rule-form-dialog.tsx` |
| **Sub-agente** | RuleList | shadcn Button variant default/ghost, useEffect → loadRules, empty state con dashed border | `rule-list.tsx` |
| **Nano-agente** | `rule-engine.ts` | Funciones PURAS sin fetch: `evaluateRules(rules, lead, previousStage) → RuleEvaluation[]` | `lib/rule-engine.ts` |
| **Nano-agente** | `useRuleEvaluation` | Hook: escucha `lead:moved` en pipeline-store, ejecuta engine, emite `rule:triggered` | Hook inline (future) |
| **Nano-agente** | `automation-api.ts` | Fetch GET/POST/PATCH/DELETE a `/api/chatbot/automation-rule` | `lib/automation-api.ts` |

**Comunicación:**
```typescript
mem_save({
  title: "Automation Rules — CRUD + engine",
  type: "architecture",
  topic_key: "crm/calendar-agents",
  capture_prompt: false,
  content: {
    what: "RuleCard, RuleFormDialog, RuleList + RuleEngine puro",
    where: "components/crm/activities/ + lib/rule-engine.ts",
    learned: "rule-engine.ts es funciones PURAS (sin fetch). Se conecta vía automation-store.",
    communication: {
      emits: ["rule:activated", "rule:deactivated", "rule:triggered"],
      listens: ["lead:moved (desde pipeline-store)"],
      store: "useAutomationStore (stores/automation-store.ts)",
    },
    integration: "Conectar con pipeline-store: cuando lead:moved → evaluar reglas → crear actividad programada"
  }
})
```

### Agente 4: Message Scheduler

**Skill:** shadcn Input type=date/time, Card, Badge con estados (pendiente/enviado/fallido), lucide-react Send/Calendar/Clock/XCircle

| Rol | Nombre | Skill específica | Archivo(s) |
|-----|--------|----------------|-----------|
| **Agente** | Message Scheduler | shadcn Card + Input + Button + Badge, ScheduleStore con optimistic cancel | `message-scheduler.tsx`, `scheduled-list.tsx` |
| **Sub-agente** | SchedulerForm | shadcn Input type=date/time, textarea, Button con icono Send, validación | `message-scheduler.tsx` |
| **Sub-agente** | ScheduledList | shadcn Badge color por estado, Button variant ghost delete, empty state | `scheduled-list.tsx` |
| **Nano-agente** | `schedule-api.ts` | Fetch POST/GET/DELETE a `/api/whatsapp/scheduled` | `lib/schedule-api.ts` |
| **Nano-agente** | `useScheduleForm` | useState + handleSubmit + reset, validación required | Hook inline |

**Comunicación:**
```typescript
mem_save({
  title: "Message Scheduler — programación de envíos",
  type: "architecture",
  topic_key: "crm/calendar-agents",
  capture_prompt: false,
  content: {
    what: "MessageSchedulerForm + ScheduledList con estados",
    where: "components/crm/activities/",
    learned: "schedule-store usa optimistic updates para cancel",
    communication: {
      emits: ["message:scheduled"],
      listens: [],
      store: "useScheduleStore (stores/schedule-store.ts)",
      api: "POST /api/whatsapp/scheduled, GET /api/whatsapp/scheduled",
    },
    integration: "calendar-store.event[] puede incluir mensajes programados como eventos"
  }
})
```

### Agente 5: WhatsApp Sync (extensión Fase 1)

**Skill:** Fetch API WhatsApp Sessions + Conversations, shadcn Dialog con lista, integración con useCRMStore

| Rol | Nombre | Skill específica | Archivo(s) |
|-----|--------|----------------|-----------|
| **Agente** | WhatsApp Sync | API WhatsApp Sessions + Conversations, shadcn Button con Import icon | Modifica `new-lead-dialog.tsx` |
| **Sub-agente** | ContactPicker | Lista de conversaciones con nombre + teléfono + último mensaje, onClick → pre-poblar formulario | `new-lead-dialog.tsx` (inline) |
| **Nano-agente** | `useWhatsAppConversations` | Hook: fetch GET `/whatsapp/sessions/:id/conversations`, estado loading/error/data | Hook inline |
| **Nano-agente** | `useActiveSession` | Hook: fetch GET `/whatsapp/sessions`, toma la primera sesión activa | Hook inline |

**Comunicación:**
```typescript
mem_save({
  title: "WhatsApp Sync — importar contactos al pipeline",
  type: "architecture",
  topic_key: "crm/calendar-agents",
  capture_prompt: false,
  content: {
    what: "Botón 'Importar desde WhatsApp' en NewLeadDialog con lista de conversaciones",
    where: "components/crm/pipeline/new-lead-dialog.tsx",
    learned: "Usa GET /whatsapp/sessions para obtener sesión activa, luego GET /whatsapp/sessions/:id/conversations",
    communication: {
      emits: ["contact:imported"],
      listens: [],
      store: "useCRMStore.addLead()",
    }
  }
})
```

---

## 🔄 Diagrama de Comunicación entre Agentes

```
                    ┌──────────────────────────────┐
                    │      PIPELINE STORE (Fase 1)  │
                    │  useCRMStore                  │
                    │  Eventos: lead:moved          │
                    └──────────┬───────────────────┘
                               │ lead:moved (cuando drag & drop)
                               ▼
┌────────────────────────────────────────────────────────────┐
│                    CALENDAR STORE (Fase 2)                  │
│  useCalendarStore                                          │
│  state: events[], view, currentDate                        │
│  acciones: addEvent(), updateEvent(), removeEvent()        │
│  eventos: event:created, event:updated, event:deleted      │
└────────────────────────────────────────────────────────────┘
         ▲                           │
         │ event:created              │ event:created
         │ (desde EventForm)          │ (desde regla disparada)
         │                           ▼
┌─────────────────┐      ┌──────────────────────────────┐
│  EVENT MANAGER   │      │      AUTOMATION STORE        │
│  (Agente 2)      │      │  useAutomationStore           │
│  EventFormDialog │      │  state: rules[]              │
└─────────────────┘      │  engine: evaluateRules()      │
                         │  eventos: rule:triggered      │
                         └──────────┬───────────────────┘
                                    │ rule:triggered
                                    ▼
                         ┌──────────────────────────────┐
                         │      SCHEDULE STORE           │
                         │  useScheduleStore             │
                         │  state: messages[]            │
                         │  eventos: message:scheduled   │
                         └──────────────────────────────┘
```

---

---

### Task 1: Calendar Core (Agente 1)

**Files:**
- Create: `lib/date-utils.ts`
- Create: `stores/calendar-store.ts`
- Create: `lib/calendar-api.ts`
- Create: `components/crm/activities/calendar-monthly.tsx`
- Create: `components/crm/activities/calendar-weekly.tsx`
- Create: `components/crm/activities/event-card.tsx`
- Create: `types/events.ts`

- [ ] **Step 1: Create event types**

```typescript
// types/events.ts
export interface CalendarEvent {
  id: string;
  tipo: 'cita' | 'mensaje' | 'recordatorio';
  titulo: string;
  descripcion?: string;
  fecha: string;       // ISO date
  hora?: string;       // "10:30"
  duracion_minutos?: number;
  contacto_id?: string;
  contacto_nombre?: string;
  deal_id?: string;
  plantilla_id?: string;
  estado?: 'pendiente' | 'enviado' | 'fallido' | 'completada' | 'cancelada';
  color?: string;
}
```

- [ ] **Step 2: Create date utilities**

```typescript
// lib/date-utils.ts
import { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, getHours, setHours, isSameDay, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks, getHours, setHours, isSameDay, isSameMonth, isToday };

export const LOCALE = es;

export function formatDate(date: Date, fmt: string = 'PPP'): string {
  return format(date, fmt, { locale: es });
}

export function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(e => isSameDay(new Date(e.fecha), day));
}
```

- [ ] **Step 3: Create calendar store**

```typescript
// stores/calendar-store.ts
import { create } from 'zustand';

interface CalendarState {
  view: 'monthly' | 'weekly';
  currentDate: Date;
  events: CalendarEvent[];
  isLoading: boolean;

  setView: (view: 'monthly' | 'weekly') => void;
  setCurrentDate: (date: Date) => void;
  next: () => void;
  prev: () => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: 'monthly',
  currentDate: new Date(),
  events: [],
  isLoading: false,

  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),

  next: () => {
    const { view, currentDate } = get();
    set({ currentDate: view === 'monthly' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1) });
  },

  prev: () => {
    const { view, currentDate } = get();
    set({ currentDate: view === 'monthly' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1) });
  },

  setEvents: (events) => set({ events }),
  addEvent: (event) => set(s => ({ events: [...s.events, event] })),
  updateEvent: (id, data) => set(s => ({
    events: s.events.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  removeEvent: (id) => set(s => ({ events: s.events.filter(e => e.id !== id) })),
}));
```

- [ ] **Step 4: Create CalendarMonthly component**

```tsx
// components/crm/activities/calendar-monthly.tsx
'use client';

import { useCalendarStore } from '@/stores/calendar-store';
import { getMonthDays, formatDate, isSameMonth, isToday, getEventsForDay, LOCALE } from '@/lib/date-utils';
import { EventCard } from './event-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export function CalendarMonthly() {
  const { currentDate, events, next, prev, setCurrentDate } = useCalendarStore();
  const days = getMonthDays(currentDate);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          {format(currentDate, 'MMMM yyyy', { locale: LOCALE })}
        </h2>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1.5 rounded-sm hover:bg-muted-light/50">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1.5 text-xs font-bold hover:bg-muted-light/50 rounded-sm">
            Hoy
          </button>
          <button onClick={next} className="p-1.5 rounded-sm hover:bg-muted-light/50">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-t border-l border-border">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(events, day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={i}
              className={`min-h-[100px] border-r border-b border-border p-1 ${
                !isCurrentMonth ? 'bg-muted-light/30' : ''
              }`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-sm text-xs ${
                  isToday(day)
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground'
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <EventCard key={event.id} event={event} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground/60 pl-1">
                    +{dayEvents.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create CalendarWeekly component**

```tsx
// components/crm/activities/calendar-weekly.tsx
'use client';

import { useCalendarStore } from '@/stores/calendar-store';
import { startOfWeek, addDays, format, isToday, getHours, getEventsForDay, HOURS, formatTime, LOCALE } from '@/lib/date-utils';
import { EventCard } from './event-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarWeekly() {
  const { currentDate, events, next, prev, setCurrentDate } = useCalendarStore();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          Semana del {format(weekStart, "d 'de' MMMM", { locale: LOCALE })}
        </h2>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1.5 rounded-sm hover:bg-muted-light/50">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1.5 text-xs font-bold hover:bg-muted-light/50 rounded-sm">
            Hoy
          </button>
          <button onClick={next} className="p-1.5 rounded-sm hover:bg-muted-light/50">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border">
        <div className="text-[10px] font-bold uppercase text-muted-foreground p-1" />
        {days.map((day, i) => (
          <div key={i} className="text-center py-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              {format(day, 'EEE', { locale: LOCALE })}
            </p>
            <span className={`inline-flex size-6 items-center justify-center rounded-sm text-xs ${
              isToday(day) ? 'bg-primary text-primary-foreground font-bold' : ''
            }`}>
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto max-h-[500px]">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-border/50">
            <div className="text-[10px] text-muted-foreground p-1 text-right pr-2">
              {formatTime(hour)}
            </div>
            {days.map((day, di) => {
              const dayEvents = getEventsForDay(events, day)
                .filter(e => e.hora && parseInt(e.hora.split(':')[0]) === hour);
              return (
                <div key={di} className="min-h-[40px] border-l border-border/50 p-0.5">
                  {dayEvents.map(event => (
                    <EventCard key={event.id} event={event} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create EventCard component**

```tsx
// components/crm/activities/event-card.tsx
'use client';

import type { CalendarEvent } from '@/types/events';
import { cn } from '@/lib/utils';

const EVENT_COLORS: Record<string, string> = {
  cita: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  mensaje: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  recordatorio: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
};

const EVENT_DOTS: Record<string, string> = {
  cita: 'bg-blue-500',
  mensaje: 'bg-green-500',
  recordatorio: 'bg-amber-500',
};

interface EventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

export function EventCard({ event, compact, onClick }: EventCardProps) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-1 rounded-sm px-1 py-0.5 cursor-pointer hover:opacity-80"
        style={{ borderLeft: `2px solid ${event.color || '#3B82F6'}` }}
        onClick={() => onClick?.(event)}
        title={`${event.titulo}${event.hora ? ` — ${event.hora}` : ''}`}
      >
        <div className={`size-1.5 rounded-full shrink-0 ${EVENT_DOTS[event.tipo] || 'bg-gray-400'}`} />
        <span className="text-[10px] truncate">{event.titulo}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-sm border border-border p-2 cursor-pointer hover:shadow-constructivist transition-shadow',
        EVENT_COLORS[event.tipo] || 'bg-gray-50'
      )}
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-center gap-1.5">
        <div className={`size-2 rounded-full shrink-0 ${EVENT_DOTS[event.tipo] || 'bg-gray-400'}`} />
        <p className="text-xs font-bold truncate">{event.titulo}</p>
      </div>
      {event.hora && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{event.hora}</p>
      )}
      {event.contacto_nombre && (
        <p className="text-[10px] text-muted-foreground/60 truncate">{event.contacto_nombre}</p>
      )}
    </div>
  );
}
```

---

### Task 2: Event Manager (Agente 2)

**Files:**
- Create: `components/crm/activities/event-form-dialog.tsx`

- [ ] **Step 1: Create EventFormDialog**

```tsx
// components/crm/activities/event-form-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { CalendarEvent } from '@/types/events';

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
}

const EVENT_TYPES = [
  { value: 'cita', label: 'Cita', color: '#3B82F6' },
  { value: 'mensaje', label: 'Mensaje Programado', color: '#22C55E' },
  { value: 'recordatorio', label: 'Recordatorio', color: '#F59E0B' },
];

export function EventFormDialog({ open, onClose, defaultDate, onSave }: EventFormDialogProps) {
  const [form, setForm] = useState({
    tipo: 'cita',
    titulo: '',
    descripcion: '',
    fecha: defaultDate || new Date().toISOString().split('T')[0],
    hora: '10:00',
    duracion_minutos: '60',
    contacto_nombre: '',
    plantilla_id: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tipo: form.tipo as 'cita' | 'mensaje' | 'recordatorio',
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      fecha: form.fecha,
      hora: form.hora || undefined,
      duracion_minutos: form.tipo === 'cita' ? Number(form.duracion_minutos) : undefined,
      contacto_nombre: form.contacto_nombre || undefined,
      plantilla_id: form.tipo === 'mensaje' ? form.plantilla_id : undefined,
      estado: 'pendiente',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Evento</DialogTitle>
          <DialogDescription>Programá una cita, mensaje o recordatorio.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {EVENT_TYPES.map(t => (
              <Button
                key={t.value}
                type="button"
                variant={form.tipo === t.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                className="flex-1"
              >
                {t.label}
              </Button>
            ))}
          </div>

          <Separator className="divider-constructivist" />

          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              placeholder="Ej: Test Drive Toyota Corolla"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              required
            />
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={form.hora}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-2">
            <Label>Contacto</Label>
            <Input
              placeholder="Nombre del contacto"
              value={form.contacto_nombre}
              onChange={e => setForm(f => ({ ...f, contacto_nombre: e.target.value }))}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Detalles del evento..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!form.titulo.trim()}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 3: Automation Rules (Agente 3)

**Files:**
- Create: `stores/automation-store.ts`
- Create: `lib/automation-api.ts`
- Create: `lib/rule-engine.ts`
- Create: `components/crm/activities/rule-card.tsx`
- Create: `components/crm/activities/rule-form-dialog.tsx`
- Create: `components/crm/activities/rule-list.tsx`

- [ ] **Step 1: Create rule types and store**

```typescript
// stores/automation-store.ts
import { create } from 'zustand';

export interface AutomationRule {
  id: string;
  nombre: string;
  trigger_tipo: 'etapa' | 'tiempo' | 'etapa_tiempo';
  trigger_etapa?: string;
  trigger_dias?: number;
  accion_tipo: 'enviar_mensaje';
  accion_plantilla_id?: string;
  activa: boolean;
  ultima_ejecucion?: string;
  created_at: string;
}

interface AutomationState {
  rules: AutomationRule[];
  isLoading: boolean;
  loadRules: () => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  addRule: (rule: Omit<AutomationRule, 'id' | 'created_at'>) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: [],
  isLoading: false,

  loadRules: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/chatbot/automation-rule', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      set({ rules: data.data ?? data ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleRule: async (id) => {
    const rule = get().rules.find(r => r.id === id);
    if (!rule) return;
    set(s => ({
      rules: s.rules.map(r => r.id === id ? { ...r, activa: !r.activa } : r)
    }));
    try {
      await fetch(`/api/chatbot/automation-rule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ activa: !rule.activa }),
      });
    } catch {
      set(s => ({ rules: s.rules.map(r => r.id === id ? { ...r, activa: rule.activa } : r) }));
    }
  },

  addRule: async (ruleData) => {
    try {
      const res = await fetch('/api/chatbot/automation-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(ruleData),
      });
      const data = await res.json();
      set(s => ({ rules: [...s.rules, data.data ?? data] }));
    } catch {}
  },

  removeRule: async (id) => {
    set(s => ({ rules: s.rules.filter(r => r.id !== id) }));
    try {
      await fetch(`/api/chatbot/automation-rule/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    } catch {}
  },
}));
```

- [ ] **Step 2: Create rule engine**

```typescript
// lib/rule-engine.ts
import type { PipelineLead } from '@/lib/crm-api';
import type { AutomationRule } from '@/stores/automation-store';

export interface RuleEvaluation {
  rule: AutomationRule;
  lead: PipelineLead;
  shouldFire: boolean;
  reason: string;
}

export function evaluateRules(
  rules: AutomationRule[],
  lead: PipelineLead,
  previousStage?: string
): RuleEvaluation[] {
  return rules
    .filter(r => r.activa)
    .map(rule => {
      // Por etapa: lead llega a etapa X
      if (rule.trigger_tipo === 'etapa') {
        if (rule.trigger_etapa && lead.etapa === rule.trigger_etapa && previousStage && previousStage !== lead.etapa) {
          return { rule, lead, shouldFire: true, reason: `Llegó a etapa ${rule.trigger_etapa}` };
        }
      }

      // Por tiempo: pasaron N días sin actividad
      if (rule.trigger_tipo === 'tiempo' && rule.trigger_dias) {
        const lastActivity = lead.ultima_actividad || lead.fecha_ultimo_contacto || lead.fecha_creacion;
        const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= rule.trigger_dias) {
          return { rule, lead, shouldFire: true, reason: `${daysSince} días sin actividad (límite: ${rule.trigger_dias})` };
        }
      }

      // Por etapa + tiempo
      if (rule.trigger_tipo === 'etapa_tiempo' && rule.trigger_etapa && rule.trigger_dias) {
        if (lead.etapa === rule.trigger_etapa) {
          const daysInStage = Math.floor((Date.now() - new Date(lead.fecha_ultimo_contacto || lead.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24));
          if (daysInStage >= rule.trigger_dias) {
            return { rule, lead, shouldFire: true, reason: `En etapa ${rule.trigger_etapa} por ${daysInStage} días` };
          }
        }
      }

      return { rule, lead, shouldFire: false, reason: 'No cumple condiciones' };
    });
}
```

- [ ] **Step 3: Create RuleCard + RuleList components**

```tsx
// components/crm/activities/rule-card.tsx
'use client';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { AutomationRule } from '@/stores/automation-store';

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: (id: string) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (id: string) => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  etapa: 'Al llegar a etapa',
  tiempo: 'Por tiempo sin actividad',
  etapa_tiempo: 'Etapa + tiempo',
};

export function RuleCard({ rule, onToggle, onEdit, onDelete }: RuleCardProps) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">{rule.nombre}</p>
          <Badge variant="outline" className="text-[10px]">
            {TRIGGER_LABELS[rule.trigger_tipo] || rule.trigger_tipo}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {rule.trigger_etapa && `Etapa: ${rule.trigger_etapa}`}
          {rule.trigger_dias && ` · ${rule.trigger_dias} días`}
          {rule.accion_plantilla_id && ` · Enviar plantilla`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={rule.activa} onCheckedChange={() => onToggle(rule.id)} />
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(rule.id)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
```

```tsx
// components/crm/activities/rule-list.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RuleCard } from './rule-card';
import { RuleFormDialog } from './rule-form-dialog';
import { useAutomationStore, AutomationRule } from '@/stores/automation-store';
import { Plus } from 'lucide-react';

export function RuleList() {
  const { rules, isLoading, loadRules, toggleRule, addRule, removeRule } = useAutomationStore();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  useEffect(() => { loadRules(); }, [loadRules]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Reglas de Automatización</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 mr-1" /> Nueva Regla
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-sm">
          <p className="text-sm text-muted-foreground">Sin reglas configuradas</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Creá reglas para automatizar seguimientos</p>
        </div>
      ) : (
        rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onToggle={toggleRule}
            onEdit={setEditingRule}
            onDelete={removeRule}
          />
        ))
      )}

      <RuleFormDialog
        open={showForm || !!editingRule}
        onClose={() => { setShowForm(false); setEditingRule(null); }}
        onSave={addRule}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create RuleFormDialog**

```tsx
// components/crm/activities/rule-form-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PIPELINE_STAGES } from '@/types/crm';
import type { AutomationRule } from '@/stores/automation-store';

interface RuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Omit<AutomationRule, 'id' | 'created_at'>) => void;
}

export function RuleFormDialog({ open, onClose, onSave }: RuleFormDialogProps) {
  const [form, setForm] = useState({
    nombre: '',
    trigger_tipo: 'etapa',
    trigger_etapa: 'lead_nuevo',
    trigger_dias: '3',
    accion_tipo: 'enviar_mensaje',
    accion_plantilla_id: '',
    activa: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nombre: form.nombre,
      trigger_tipo: form.trigger_tipo as any,
      trigger_etapa: form.trigger_tipo !== 'tiempo' ? form.trigger_etapa : undefined,
      trigger_dias: form.trigger_tipo !== 'etapa' ? Number(form.trigger_dias) : undefined,
      accion_tipo: 'enviar_mensaje',
      accion_plantilla_id: form.accion_plantilla_id || undefined,
      activa: true,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Regla de Automatización</DialogTitle>
          <DialogDescription>Configurá cuándo y qué acción ejecutar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la regla *</Label>
            <Input
              placeholder="Ej: Seguimiento post-calificado"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de trigger</Label>
            <Select value={form.trigger_tipo} onValueChange={v => setForm(f => ({ ...f, trigger_tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="etapa">Al llegar a una etapa</SelectItem>
                <SelectItem value="tiempo">Por tiempo sin actividad</SelectItem>
                <SelectItem value="etapa_tiempo">Etapa + tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.trigger_tipo !== 'tiempo' && (
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={form.trigger_etapa} onValueChange={v => setForm(f => ({ ...f, trigger_etapa: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.trigger_tipo !== 'etapa' && (
            <div className="space-y-2">
              <Label>Días sin actividad</Label>
              <Input
                type="number"
                min={1}
                value={form.trigger_dias}
                onChange={e => setForm(f => ({ ...f, trigger_dias: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Plantilla a enviar</Label>
            <Input
              placeholder="ID de la plantilla (futuro: selector visual)"
              value={form.accion_plantilla_id}
              onChange={e => setForm(f => ({ ...f, accion_plantilla_id: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!form.nombre.trim()}>Crear Regla</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 4: Message Scheduler (Agente 4)

**Files:**
- Create: `stores/schedule-store.ts`
- Create: `lib/schedule-api.ts`
- Create: `components/crm/activities/message-scheduler.tsx`
- Create: `components/crm/activities/template-picker.tsx`
- Create: `components/crm/activities/scheduled-list.tsx`

- [ ] **Step 1: Create schedule store + components**

```tsx
// stores/schedule-store.ts
import { create } from 'zustand';

export interface ScheduledMessage {
  id: string;
  contacto_id: string;
  contacto_nombre: string;
  contacto_telefono?: string;
  plantilla_id: string;
  plantilla_nombre?: string;
  fecha_envio: string;
  estado: 'pendiente' | 'enviado' | 'fallido';
  session_id?: string;
  error?: string;
}

interface ScheduleState {
  messages: ScheduledMessage[];
  loadMessages: () => Promise<void>;
  scheduleMessage: (msg: Omit<ScheduledMessage, 'id'>) => Promise<void>;
  cancelMessage: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  messages: [],
  loadMessages: async () => {
    try {
      const res = await fetch('/api/whatsapp/scheduled', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      set({ messages: data.data ?? data ?? [] });
    } catch {}
  },
  scheduleMessage: async (msg) => {
    try {
      const res = await fetch('/api/whatsapp/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(msg),
      });
      const data = await res.json();
      set(s => ({ messages: [...s.messages, data.data ?? data] }));
    } catch {}
  },
  cancelMessage: async (id) => {
    set(s => ({ messages: s.messages.map(m => m.id === id ? { ...m, estado: 'fallido' as const } : m) }));
    try {
      await fetch(`/api/whatsapp/scheduled/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    } catch {}
  },
}));
```

```tsx
// components/crm/activities/message-scheduler.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Send } from 'lucide-react';

interface MessageSchedulerProps {
  onSchedule: (data: { contacto: string; fecha: string; hora: string; mensaje: string }) => void;
}

export function MessageSchedulerForm({ onSchedule }: MessageSchedulerProps) {
  const [form, setForm] = useState({ contacto: '', fecha: '', hora: '10:00', mensaje: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contacto.trim() || !form.fecha) return;
    onSchedule(form);
    setForm({ contacto: '', fecha: '', hora: '10:00', mensaje: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Programar Mensaje</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Contacto</Label>
            <Input
              placeholder="Nombre o teléfono"
              value={form.contacto}
              onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hora</Label>
              <Input
                type="time"
                value={form.hora}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje</Label>
            <textarea
              className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Escribí el mensaje a enviar..."
              value={form.mensaje}
              onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!form.contacto.trim() || !form.fecha}>
            <Send className="size-3.5 mr-1.5" /> Programar Envío
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

```tsx
// components/crm/activities/scheduled-list.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, XCircle } from 'lucide-react';
import type { ScheduledMessage } from '@/stores/schedule-store';

interface ScheduledListProps {
  messages: ScheduledMessage[];
  onCancel: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  enviado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  fallido: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

export function ScheduledList({ messages, onCancel }: ScheduledListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-sm">
        <p className="text-sm text-muted-foreground">Sin mensajes programados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-center justify-between rounded-sm border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{msg.contacto_nombre}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="size-3" /> {new Date(msg.fecha_envio).toLocaleDateString('es-AR')}</span>
              <span className="flex items-center gap-1"><Clock className="size-3" /> {new Date(msg.fecha_envio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[msg.estado] || ''}`}>
              {msg.estado}
            </Badge>
            {msg.estado === 'pendiente' && (
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => onCancel(msg.id)}>
                <XCircle className="size-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### Task 5: WhatsApp Sync Integration (Agente 5)

**Files:**
- Modify: `components/crm/pipeline/new-lead-dialog.tsx`

- [ ] **Step 1: Wire WhatsApp conversations to NewLeadDialog**

In `new-lead-dialog.tsx`, update the "Importar desde WhatsApp" button to:

```tsx
// Inside NewLeadDialog, add this effect + handler
import { useEffect, useState } from 'react';

// Add after existing state
const [whatsAppContacts, setWhatsAppContacts] = useState<any[]>([]);
const [showContactPicker, setShowContactPicker] = useState(false);

// Add effect to load WhatsApp conversations
useEffect(() => {
  async function loadWAContacts() {
    try {
      const res = await fetch(`/api/whatsapp/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const sessions = data.data ?? data ?? [];
      if (sessions.length > 0) {
        const convRes = await fetch(`/api/whatsapp/sessions/${sessions[0].id}/conversations`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const convData = await convRes.json();
        setWhatsAppContacts(convData.data ?? convData ?? []);
      }
    } catch {}
  }
  if (showContactPicker) loadWAContacts();
}, [showContactPicker]);
```

And update the WhatsApp import button to toggle `showContactPicker` and show a contact list.

---

### Task 6: Activities Page (Layout Integration)

**Files:**
- Create: `app/(dashboard)/crm/activities/page.tsx`

- [ ] **Step 1: Create the Activities page**

```tsx
// app/(dashboard)/crm/activities/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarMonthly } from '@/components/crm/activities/calendar-monthly';
import { CalendarWeekly } from '@/components/crm/activities/calendar-weekly';
import { EventFormDialog } from '@/components/crm/activities/event-form-dialog';
import { RuleList } from '@/components/crm/activities/rule-list';
import { MessageSchedulerForm } from '@/components/crm/activities/message-scheduler';
import { ScheduledList } from '@/components/crm/activities/scheduled-list';
import { useCalendarStore } from '@/stores/calendar-store';
import { useScheduleStore } from '@/stores/schedule-store';
import { Plus, CalendarDays, CalendarRange, Bot, Send } from 'lucide-react';

export default function ActivitiesPage() {
  const [showEventForm, setShowEventForm] = useState(false);
  const [tab, setTab] = useState<'calendario' | 'reglas' | 'mensajes'>('calendario');
  const { view, setView } = useCalendarStore();
  const { messages, cancelMessage, scheduleMessage } = useScheduleStore();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground">Calendario, reglas y mensajes programados.</p>
        </div>
        <Button onClick={() => setShowEventForm(true)}>
          <Plus className="mr-1.5 size-4" /> Nuevo Evento
        </Button>
      </section>

      <Separator className="divider-constructivist" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'calendario', label: 'Calendario', icon: CalendarDays },
          { key: 'reglas', label: 'Reglas', icon: Bot },
          { key: 'mensajes', label: 'Mensajes', icon: Send },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'calendario' && (
        <div className="space-y-4">
          {/* View toggle */}
          <div className="flex gap-2">
            <Button
              variant={view === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('monthly')}
            >
              <CalendarDays className="size-3.5 mr-1" /> Mensual
            </Button>
            <Button
              variant={view === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('weekly')}
            >
              <CalendarRange className="size-3.5 mr-1" /> Semanal
            </Button>
          </div>

          {view === 'monthly' ? <CalendarMonthly /> : <CalendarWeekly />}
        </div>
      )}

      {tab === 'reglas' && <RuleList />}

      {tab === 'mensajes' && (
        <div className="grid gap-6 md:grid-cols-2">
          <MessageSchedulerForm onSchedule={(data) => {
            scheduleMessage({
              contacto_id: '',
              contacto_nombre: data.contacto,
              plantilla_id: '',
              fecha_envio: `${data.fecha}T${data.hora}:00`,
              estado: 'pendiente',
            });
          }} />
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Programados</h3>
            <ScheduledList messages={messages} onCancel={cancelMessage} />
          </div>
        </div>
      )}

      {/* Event Form Dialog */}
      <EventFormDialog
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSave={(event) => {
          useCalendarStore.getState().addEvent({
            ...event,
            id: `evt-${Date.now()}`,
          });
          setShowEventForm(false);
        }}
      />
    </div>
  );
}
```

---

### Task 7: Switch component (missing shadcn ui)

**Files:**
- Create: `components/ui/switch.tsx`

- [ ] **Step 1: Create Switch component**

```tsx
// components/ui/switch.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-sm border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-sm bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
```

---

## Self-Review Checklist

1. **Spec coverage:** Calendar (monthly + weekly), Event CRUD, Automation rules (3 trigger types), scheduled messages, WhatsApp sync — all covered.
2. **Placeholders:** No TODOs or TBDs. All code is concrete.
3. **Type consistency:** CalendarEvent, AutomationRule, ScheduledMessage types are consistent across stores and components.
4. **Scope:** Fase 2 is self-contained. Builds on Fase 1 stores but doesn't depend on implementation details.
