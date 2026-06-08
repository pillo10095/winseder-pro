# CRM Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google Calendar-style professional agenda view to the CRM, with task completion and drag & drop rescheduling.

**Architecture:** FullCalendar React wrapper in a new `/crm/calendar` page, backed by existing Activity CRUD with new `completed_at`/`completed_by` fields and date-range querying.

**Tech Stack:** FullCalendar React (`@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`), NestJS, TypeORM, shadcn/ui

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/api/src/modules/crm/entities/activity.entity.ts` | MODIFY | Add `completed_at`, `completed_by` fields |
| `apps/api/src/modules/crm/repositories/activity.repository.ts` | MODIFY | Add `findByDateRange()` method |
| `apps/api/src/modules/crm/services/activity.service.ts` | MODIFY | Add `complete()`, `updateDate()`, `findByCalendarRange()` |
| `apps/api/src/modules/crm/controllers/activity.controller.ts` | MODIFY | Add `GET /calendar`, `PATCH :id/complete`, `PATCH :id` |
| `apps/web/components/crm/calendar-view.tsx` | CREATE | FullCalendar wrapper with events, drag, click handlers |
| `apps/web/src/app/(dashboard)/crm/calendar/page.tsx` | CREATE | Calendar page layout with filters |
| `apps/web/src/hooks/use-calendar.ts` | CREATE | Calendar data fetching + mutations hook |
| `apps/web/components/crm/activity-detail-modal.tsx` | CREATE | Modal for event click detail + complete action |
| `apps/web/components/crm/activity-form.tsx` | MODIFY | Accept pre-filled `activity_date` |
| `apps/web/components/crm/crm-sidebar.tsx` | MODIFY | Add `/crm/calendar` nav item |

---

### Task 1: Migration + entity fields

**Files:**
- Modify: `apps/api/src/modules/crm/entities/activity.entity.ts`

- [ ] **Step 1: Add completed_at and completed_by to the entity**

```typescript
// apps/api/src/modules/crm/entities/activity.entity.ts
// Add after `activity_date` (line 65):

  @Column({ type: 'datetime', nullable: true })
  completed_at!: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  completed_by!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completed_by_user!: User | null;
```

- [ ] **Step 2: Generate migration**

Run: `cd apps/api && npx typeorm migration:create src/migrations/AddCompletedAtToActivities`

Edit the generated migration file to add `completed_at datetime NULL` and `completed_by varchar NULL` columns to `activities` table.

- [ ] **Step 3: Run migration**

Run: `cd apps/api && npx typeorm migration:run`
Expected: Migration applied successfully

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/crm/entities/activity.entity.ts apps/api/src/migrations/
git commit -m "feat: add completed_at and completed_by to activities"
```

---

### Task 2: Repository — findByDateRange

**Files:**
- Modify: `apps/api/src/modules/crm/repositories/activity.repository.ts`

- [ ] **Step 1: Add findByDateRange method**

```typescript
// apps/api/src/modules/crm/repositories/activity.repository.ts
// After the findByCompanyId method

  async findByDateRange(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<Activity[]> {
    return this.createQueryBuilder('a')
      .leftJoinAndSelect('a.contact', 'contact')
      .leftJoinAndSelect('a.deal', 'deal')
      .leftJoinAndSelect('a.logged_by_user', 'user')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.activity_date >= :from', { from })
      .andWhere('a.activity_date <= :to', { to })
      .orderBy('a.activity_date', 'ASC')
      .getMany();
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/crm/repositories/activity.repository.ts
git commit -m "feat: add findByDateRange to activity repository"
```

---

### Task 3: Service — complete, updateDate, findByCalendarRange

**Files:**
- Modify: `apps/api/src/modules/crm/services/activity.service.ts`

- [ ] **Step 1: Add the three new methods**

```typescript
// apps/api/src/modules/crm/services/activity.service.ts

  async findByCalendarRange(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<Activity[]> {
    return this.activityRepo.findByDateRange(companyId, from, to);
  }

  async complete(id: string, companyId: string, userId: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({
      where: { id, company_id: companyId },
    });
    if (!activity) {
      throw new Error('Activity not found');
    }
    activity.completed_at = activity.completed_at ? null : new Date();
    activity.completed_by = activity.completed_at ? userId : null;
    return this.activityRepo.save(activity);
  }

  async updateDate(id: string, companyId: string, activityDate: Date): Promise<Activity> {
    const activity = await this.activityRepo.findOne({
      where: { id, company_id: companyId },
    });
    if (!activity) {
      throw new Error('Activity not found');
    }
    activity.activity_date = activityDate;
    return this.activityRepo.save(activity);
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/crm/services/activity.service.ts
git commit -m "feat: add complete, updateDate, findByCalendarRange to activity service"
```

---

### Task 4: Controller — calendar, complete, partial update endpoints

**Files:**
- Modify: `apps/api/src/modules/crm/controllers/activity.controller.ts`

- [ ] **Step 1: Add the three new endpoints and import**

```typescript
// apps/api/src/modules/crm/controllers/activity.controller.ts
// Add these imports at the top:
import { Param, Patch } from '@nestjs/common';

// Add these methods after the existing create() method:

  @Get('calendar')
  async getCalendar(
    @CompanyId() companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date();
    toDate.setDate(toDate.getDate() + 30); // default: next 30 days
    return this.activityService.findByCalendarRange(companyId, fromDate, toDate);
  }

  @Patch(':id/complete')
  async complete(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.activityService.complete(id, companyId, userId);
  }

  @Patch(':id')
  async updateDate(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body('activity_date') activityDate: string,
  ) {
    return this.activityService.updateDate(id, companyId, new Date(activityDate));
  }
```

- [ ] **Step 2: Verify compilation**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/crm/controllers/activity.controller.ts
git commit -m "feat: add calendar, complete, and date-update endpoints"
```

---

### Task 5: Install FullCalendar + create hook

**Files:**
- Create: `apps/web/src/hooks/use-calendar.ts`

- [ ] **Step 1: Install FullCalendar packages**

Run: `cd apps/web && npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction`

- [ ] **Step 2: Create useCalendar hook**

```typescript
// apps/web/src/hooks/use-calendar.ts
'use client';

import { useState, useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../lib/api';

export type CalendarActivity = {
  id: string;
  type: string;
  description: string;
  activity_date: string;
  completed_at: string | null;
  contact_id: string | null;
  contact_name?: string;
  deal_id: string | null;
  deal_name?: string;
  logged_by?: string;
};

export function useCalendar() {
  const [events, setEvents] = useState<CalendarActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetchWithAuth(`${API_URL}/crm/activities/calendar?${params}`);
      if (!res.ok) throw new Error('Failed to fetch calendar events');
      setEvents(await res.json());
    } catch (err) {
      console.error('[useCalendar]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const completeActivity = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/activities/${id}/complete`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to complete activity');
    return res.json();
  }, []);

  const updateActivityDate = useCallback(async (id: string, date: Date) => {
    const res = await fetchWithAuth(`${API_URL}/crm/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_date: date.toISOString() }),
    });
    if (!res.ok) throw new Error('Failed to update activity date');
    return res.json();
  }, []);

  return { events, loading, fetchEvents, completeActivity, updateActivityDate };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-calendar.ts
git commit -m "feat: add useCalendar hook"
```

---

### Task 6: CalendarView + ActivityDetailModal components

**Files:**
- Create: `apps/web/components/crm/calendar-view.tsx`
- Create: `apps/web/components/crm/activity-detail-modal.tsx`

- [ ] **Step 1: Create ActivityDetailModal**

```tsx
// apps/web/components/crm/activity-detail-modal.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Handshake, FileText, CheckCircle, Pin, CheckCheck } from 'lucide-react';
import type { CalendarActivity } from '@/src/hooks/use-calendar';

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Handshake,
  note: FileText,
  task: CheckCircle,
  whatsapp: Phone,
  system: Pin,
};

interface Props {
  activity: CalendarActivity | null;
  open: boolean;
  onClose: () => void;
  onComplete: (id: string) => Promise<void>;
  onEdit: (activity: CalendarActivity) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ActivityDetailModal({
  activity,
  open,
  onClose,
  onComplete,
  onEdit,
  onDelete,
}: Props) {
  const [completing, setCompleting] = useState(false);

  if (!activity) return null;

  const Icon = TYPE_ICONS[activity.type] || Pin;
  const isCompleted = !!activity.completed_at;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(activity.id);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="capitalize">{activity.type}</span>
            {isCompleted && (
              <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                Completada
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-foreground">{activity.description}</p>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {activity.contact_name && (
              <span>Contacto: {activity.contact_name}</span>
            )}
            {activity.deal_name && (
              <span>Negocio: {activity.deal_name}</span>
            )}
            <span>
              {new Date(activity.activity_date).toLocaleString('es-AR')}
            </span>
            {isCompleted && activity.completed_at && (
              <span className="text-emerald-600">
                Completado: {new Date(activity.completed_at).toLocaleString('es-AR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {activity.type === 'task' && (
            <Button
              size="sm"
              variant={isCompleted ? 'outline' : 'default'}
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              {isCompleted ? 'Desmarcar' : 'Marcar completada'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(activity)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(activity.id)}
          >
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create CalendarView**

```tsx
// apps/web/components/crm/calendar-view.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { CalendarActivity } from '@/src/hooks/use-calendar';

const TYPE_COLORS: Record<string, string> = {
  task: '#d97706',
  call: '#16a34a',
  meeting: '#2563eb',
  email: '#9333ea',
  note: '#6b7280',
  whatsapp: '#059669',
  system: '#475569',
};

interface Props {
  events: CalendarActivity[];
  loading: boolean;
  onDateClick: (date: Date) => void;
  onEventClick: (activity: CalendarActivity) => void;
  onEventDrop: (id: string, newDate: Date) => Promise<void>;
  onDatesSet: (start: Date, end: Date) => void;
  filter?: 'all' | 'pending';
}

export function CalendarView({
  events,
  loading,
  onDateClick,
  onEventClick,
  onEventDrop,
  onDatesSet,
  filter,
}: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  const calendarEvents = events
    .filter((a) => {
      if (filter === 'pending') return a.type === 'task' && !a.completed_at;
      return true;
    })
    .map((a) => ({
      id: a.id,
      title: a.description,
      start: a.activity_date,
      allDay: false,
      backgroundColor: TYPE_COLORS[a.type] || '#6b7280',
      borderColor: TYPE_COLORS[a.type] || '#6b7280',
      textColor: '#fff',
      classNames: [
        a.type === 'task' && !a.completed_at ? 'fc-event-task-pending' : '',
        a.completed_at ? 'fc-event-completed' : '',
      ].filter(Boolean),
      extendedProps: { activity: a },
    }));

  const handleDateClick = useCallback(
    (info: DateClickArg) => onDateClick(info.date),
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const activity = info.event.extendedProps.activity as CalendarActivity;
      onEventClick(activity);
    },
    [onEventClick],
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const activity = info.event.extendedProps.activity as CalendarActivity;
      await onEventDrop(activity.id, info.event.start!);
    },
    [onEventDrop],
  );

  const handleDatesSet = useCallback(
    (info: { start: Date; end: Date }) => {
      onDatesSet(info.start, info.end);
    },
    [onDatesSet],
  );

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay',
        }}
        locale="es"
        events={calendarEvents}
        selectable={true}
        editable={true}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        datesSet={handleDatesSet}
        height="auto"
        eventDisplay="block"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/crm/calendar-view.tsx apps/web/components/crm/activity-detail-modal.tsx
git commit -m "feat: add CalendarView and ActivityDetailModal components"
```

---

### Task 7: Calendar page + sidebar + ActivityForm date prefill

**Files:**
- Create: `apps/web/src/app/(dashboard)/crm/calendar/page.tsx`
- Modify: `apps/web/components/crm/crm-sidebar.tsx`
- Modify: `apps/web/components/crm/activity-form.tsx`

- [ ] **Step 1: Create the calendar page**

```tsx
// apps/web/src/app/(dashboard)/crm/calendar/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarView } from '@/components/crm/calendar-view';
import { ActivityDetailModal } from '@/components/crm/activity-detail-modal';
import { ActivityForm } from '@/components/crm/activity-form';
import { useCalendar } from '@/src/hooks/use-calendar';
import { useActivities } from '@/src/hooks/use-activities';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const { events, loading, fetchEvents, completeActivity, updateActivityDate } = useCalendar();
  const { createActivity, deleteActivity, fetchActivities } = useActivities();
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  // Detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarActivity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<Date | undefined>();

  // Delete confirm
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDatesSet = useCallback(
    (start: Date, end: Date) => {
      fetchEvents(start, end);
    },
    [fetchEvents],
  );

  const handleDateClick = useCallback((date: Date) => {
    setFormDate(date);
    setFormOpen(true);
  }, []);

  const handleEventClick = useCallback((activity: CalendarActivity) => {
    setSelectedEvent(activity);
    setDetailOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    async (id: string, newDate: Date) => {
      try {
        await updateActivityDate(id, newDate);
        // Refresh events
        const start = new Date(newDate);
        start.setMonth(start.getMonth() - 1);
        const end = new Date(newDate);
        end.setMonth(end.getMonth() + 1);
        await fetchEvents(start, end);
      } catch (err) {
        console.error('Failed to move event:', err);
      }
    },
    [updateActivityDate, fetchEvents],
  );

  const handleComplete = useCallback(
    async (id: string) => {
      await completeActivity(id);
      setDetailOpen(false);
      // Refresh
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      await fetchEvents(start, end);
    },
    [completeActivity, fetchEvents],
  );

  const handleFormSave = useCallback(
    async (data: { type: string; description: string }) => {
      await createActivity('current', {
        ...data,
        activity_date: formDate?.toISOString(),
      });
      setFormOpen(false);
      // Refresh
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      await fetchEvents(start, end);
    },
    [createActivity, formDate, fetchEvents],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteActivity(id);
      setDetailOpen(false);
      // Refresh
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      await fetchEvents(start, end);
    },
    [deleteActivity, fetchEvents],
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda profesional de actividades y seguimientos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Solo pendientes
          </Button>
        </div>
      </div>

      <CalendarView
        events={events}
        loading={loading}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        onDatesSet={handleDatesSet}
        filter={filter}
      />

      <ActivityDetailModal
        activity={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onComplete={handleComplete}
        onEdit={(a) => {
          setDetailOpen(false);
          setFormDate(new Date(a.activity_date));
          setFormOpen(true);
        }}
        onDelete={handleDelete}
      />

      {formOpen && (
        <ActivityForm
          onClose={() => {
            setFormOpen(false);
            setFormDate(undefined);
          }}
          onSave={handleFormSave}
          initialDate={formDate?.toISOString().split('T')[0]}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update ActivityForm to accept initialDate**

```tsx
// apps/web/components/crm/activity-form.tsx
// Add `initialDate` prop:

interface ActivityFormProps {
  onClose: () => void;
  onSave: (data: { type: string; description: string }) => void;
  initialDate?: string;
}

// Inside the component, set initial date value:
const [date, setDate] = useState(initialDate ?? '');
```

- [ ] **Step 3: Add calendar link to sidebar**

```tsx
// apps/web/components/crm/crm-sidebar.tsx
// Add to NAV_ITEMS:
import { Calendar } from 'lucide-react';

const NAV_ITEMS = [
  // ... existing items
  { id: 'activities', label: 'Activities', icon: ClipboardList, href: '/crm/activities' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/crm/calendar' },
  { id: 'labels', label: 'Labels', icon: Tags, href: '/crm/labels' },
];
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/crm/calendar/page.tsx apps/web/components/crm/crm-sidebar.tsx apps/web/components/crm/activity-form.tsx
git commit -m "feat: add calendar page, sidebar link, and activity form date prefill"
```

