# CRM Pipeline — Phase 1: Pipeline + WhatsApp Sync

> **For agentic workers:** Each task is independent and can run in parallel. Tasks use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el Pipeline Kanban que convierte contactos de WhatsApp en leads y los gestiona por etapas.

**Architecture:** Frontend Next.js con Zustand para estado local, fetch directo a API NestJS existente. Drag & drop con @dnd-kit. Estilo constructivista consistente con el resto de Wisender Pro.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, @dnd-kit/core, Zustand, Lucide React

**Communication Protocol:**
- Zustand stores comparten estado entre componentes
- Eventos: `lead:moved`, `lead:created`, `lead:updated`, `contact:imported`
- Cada agente documenta en Engram al completar (`mem_save` con `topic_key: "crm/*"`)

---

### Task 1: Pipeline Store + API Layer

**Files:**
- Create: `stores/crm-store.ts`
- Create: `lib/crm-api.ts`

- [ ] **Step 1: Create the CRM API layer**

```typescript
// lib/crm-api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// --- Pipeline ---
export interface PipelineStage {
  key: string;
  label: string;
  color: string;
}

export interface PipelineLead {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  origen: string;
  etapa: string;
  producto_interes?: string;
  valor_estimado?: number;
  vendedor_asignado_nombre?: string;
  vendedor_asignado_id?: string;
  ultima_actividad?: string;
  fecha_creacion: string;
  fecha_ultimo_contacto?: string;
  notas?: string;
  avatar_url?: string;
}

export async function fetchPipelineLeads(): Promise<PipelineLead[]> {
  const res = await fetch(`${API_URL}/crm/pipeline`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching pipeline leads');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function updateLeadStage(leadId: string, etapa: string): Promise<void> {
  const res = await fetch(`${API_URL}/crm/pipeline/${leadId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ etapa }),
  });
  if (!res.ok) throw new Error('Error updating lead stage');
}

export async function fetchContacts(): Promise<any[]> {
  const res = await fetch(`${API_URL}/crm/contacts`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching contacts');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export interface CreateLeadDto {
  nombre: string;
  telefono?: string;
  email?: string;
  origen: string;
  producto_interes?: string;
  valor_estimado?: number;
  notas?: string;
}

export async function createLead(dto: CreateLeadDto): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error creating lead');
  return await res.json();
}
```

- [ ] **Step 2: Create the Zustand CRM store**

```typescript
// stores/crm-store.ts
import { create } from 'zustand';
import type { PipelineLead, CreateLeadDto } from '@/lib/crm-api';
import * as api from '@/lib/crm-api';

export interface CRMEvent {
  type: 'lead:moved' | 'lead:created' | 'lead:updated' | 'contact:imported';
  payload: any;
  timestamp: number;
}

interface CRMState {
  // Data
  leads: PipelineLead[];
  isLoading: boolean;
  error: string | null;

  // Events bus (for cross-agent communication)
  eventLog: CRMEvent[];

  // Actions
  loadLeads: () => Promise<void>;
  moveLead: (leadId: string, newStage: string) => Promise<void>;
  addLead: (dto: CreateLeadDto) => Promise<void>;
  updateLead: (leadId: string, data: Partial<PipelineLead>) => void;
  emit: (type: CRMEvent['type'], payload: any) => void;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  leads: [],
  isLoading: false,
  error: null,
  eventLog: [],

  loadLeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const leads = await api.fetchPipelineLeads();
      set({ leads, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  moveLead: async (leadId: string, newStage: string) => {
    const previous = get().leads;
    // Optimistic update
    set(state => ({
      leads: state.leads.map(l => l.id === leadId ? { ...l, etapa: newStage } : l),
    }));
    try {
      await api.updateLeadStage(leadId, newStage);
      get().emit('lead:moved', { leadId, newStage });
    } catch {
      // Rollback on error
      set({ leads: previous });
    }
  },

  addLead: async (dto: CreateLeadDto) => {
    try {
      const lead = await api.createLead(dto);
      set(state => ({ leads: [...state.leads, lead] }));
      get().emit('lead:created', lead);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateLead: (leadId: string, data: Partial<PipelineLead>) => {
    set(state => ({
      leads: state.leads.map(l => l.id === leadId ? { ...l, ...data } : l),
    }));
    get().emit('lead:updated', { leadId, data });
  },

  emit: (type, payload) => {
    set(state => ({
      eventLog: [...state.eventLog.slice(-50), { type, payload, timestamp: Date.now() }],
    }));
  },
}));
```

- [ ] **Step 3: Create pipeline types**

```typescript
// types/crm.ts
export const PIPELINE_STAGES = [
  { key: 'lead_nuevo', label: 'Lead Nuevo', color: '#6B7280' },
  { key: 'calificado', label: 'Calificado', color: '#3B82F6' },
  { key: 'cita_agendada', label: 'Cita Agendada', color: '#8B5CF6' },
  { key: 'negociacion', label: 'Negociación', color: '#F59E0B' },
  { key: 'cerrado_ganado', label: 'Cerrado Ganado', color: '#22C55E' },
  { key: 'cerrado_perdido', label: 'Cerrado Perdido', color: '#EF4444' },
] as const;

export const STAGE_BG_COLORS: Record<string, string> = {
  lead_nuevo: 'bg-gray-100',
  calificado: 'bg-blue-100',
  cita_agendada: 'bg-purple-100',
  negociacion: 'bg-amber-100',
  cerrado_ganado: 'bg-green-100',
  cerrado_perdido: 'bg-red-100',
};
```

---

### Task 2: Kanban Board Component

**Files:**
- Create: `components/crm/pipeline/kanban-board.tsx`
- Create: `components/crm/pipeline/kanban-column.tsx`
- Create: `components/crm/pipeline/lead-card.tsx`
- Modify: `app/(dashboard)/crm/pipeline/page.tsx` (create)

- [ ] **Step 1: Create LeadCard component**

```typescript
// components/crm/pipeline/lead-card.tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, MessageSquare, Calendar } from 'lucide-react';
import type { PipelineLead } from '@/lib/crm-api';

const ORIGEN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  web: 'Web',
  facebook: 'Facebook',
  instagram: 'Instagram',
  referido: 'Referido',
  presencial: 'Presencial',
};

const ORIGEN_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  web: 'bg-blue-100 text-blue-800',
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  referido: 'bg-purple-100 text-purple-800',
  presencial: 'bg-amber-100 text-amber-800',
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatCurrency(value?: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

function getDaysSince(dateStr?: string): string {
  if (!dateStr) return 'Sin actividad';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

interface LeadCardProps {
  lead: PipelineLead;
  onSelect?: (lead: PipelineLead) => void;
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    >
      <Card
        className="card-constructivist cursor-grab active:cursor-grabbing"
        onClick={() => onSelect?.(lead)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header: Nombre + Origen */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(lead.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{lead.nombre}</p>
                {lead.producto_interes && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {lead.producto_interes}
                  </p>
                )}
              </div>
            </div>
            {lead.origen && (
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] px-1.5 py-0 ${ORIGEN_COLORS[lead.origen] || ''}`}
              >
                {ORIGEN_LABELS[lead.origen] || lead.origen}
              </Badge>
            )}
          </div>

          {/* Teléfono */}
          {lead.telefono && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" />
              <span>{lead.telefono}</span>
            </div>
          )}

          {/* Valor + Última actividad */}
          <div className="flex items-center justify-between pt-1">
            {lead.valor_estimado ? (
              <span className="text-sm font-bold text-primary">
                {formatCurrency(lead.valor_estimado)}
              </span>
            ) : (
              <span />
            )}
            <span className="text-[10px] text-muted-foreground/60">
              {getDaysSince(lead.ultima_actividad || lead.fecha_ultimo_contacto)}
            </span>
          </div>

          {/* Vendedor asignado */}
          {lead.vendedor_asignado_nombre && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 pt-1 border-t border-border/50">
              <span>Asignado a: {lead.vendedor_asignado_nombre}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create KanbanColumn component**

```typescript
// components/crm/pipeline/kanban-column.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { LeadCard } from './lead-card';
import type { PipelineLead } from '@/lib/crm-api';

interface KanbanColumnProps {
  stage: { key: string; label: string; color: string };
  leads: PipelineLead[];
  onSelectLead: (lead: PipelineLead) => void;
  onAddLead: (stage: string) => void;
}

export function KanbanColumn({ stage, leads, onSelectLead, onAddLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.key}`,
    data: { stage: stage.key },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <Card className={`${isOver ? 'ring-2 ring-primary/30' : ''}`}>
        <CardHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-bold">{stage.label}</CardTitle>
            </div>
            <Badge
              variant="secondary"
              className="text-[11px] font-bold rounded-sm"
            >
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className="p-2 space-y-2 min-h-[120px]"
        >
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs text-muted-foreground/60">Sin leads</p>
              <button
                onClick={() => onAddLead(stage.key)}
                className="mt-2 text-[11px] text-primary hover:underline"
              >
                + Agregar lead
              </button>
            </div>
          )}
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={onSelectLead}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create KanbanBoard component**

```typescript
// components/crm/pipeline/kanban-board.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { LeadCard } from './lead-card';
import { LeadDetailDialog } from './lead-detail-dialog';
import { useCRMStore } from '@/stores/crm-store';
import { PIPELINE_STAGES } from '@/types/crm';
import type { PipelineLead } from '@/lib/crm-api';

export function KanbanBoard() {
  const { leads, isLoading, error, loadLeads, moveLead } = useCRMStore();
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as PipelineLead;
    if (lead) {
      setActiveLead(lead);
      setActiveStage(lead.etapa);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveLead(null);
    setActiveStage(null);

    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const targetColumnId = over.id as string;
    const newStage = targetColumnId.replace('column-', '');

    if (newStage && newStage !== activeStage) {
      moveLead(leadId, newStage);
    }
  }, [moveLead, activeStage]);

  const getLeadsByStage = (stageKey: string) =>
    leads.filter(l => l.etapa === stageKey);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={loadLeads}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando pipeline...</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            leads={getLeadsByStage(stage.key)}
            onSelectLead={setSelectedLead}
            onAddLead={(s) => {
              // Will be handled by NewLeadDialog
              console.log('Add lead to stage:', s);
            }}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-3 opacity-90">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>

      <LeadDetailDialog
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </DndContext>
  );
}
```

- [ ] **Step 4: Create the Pipeline page**

```typescript
// app/(dashboard)/crm/pipeline/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KanbanBoard } from '@/components/crm/pipeline/kanban-board';
import { NewLeadDialog } from '@/components/crm/pipeline/new-lead-dialog';
import { Plus, Users, TrendingUp } from 'lucide-react';
import { useCRMStore } from '@/stores/crm-store';
import { PIPELINE_STAGES } from '@/types/crm';

export default function PipelinePage() {
  const [showNewLead, setShowNewLead] = useState(false);
  const { leads } = useCRMStore();

  const totalValue = leads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const activeLeads = leads.filter(l => !['cerrado_ganado', 'cerrado_perdido'].includes(l.etapa));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pipeline de Ventas</h1>
            <p className="text-sm text-muted-foreground">
              Gestioná tus leads desde WhatsApp hasta el cierre.
            </p>
          </div>
          <Button onClick={() => setShowNewLead(true)}>
            <Plus className="mr-1.5 size-4" />
            Nuevo Lead
          </Button>
        </div>
      </section>

      <Separator className="divider-constructivist" />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="geo-block rounded-sm bg-white dark:bg-card p-4 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Pipeline
          </p>
          <p className="mt-1 text-xl font-bold text-primary">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="geo-block rounded-sm bg-white dark:bg-card p-4 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Leads Activos
          </p>
          <p className="mt-1 text-xl font-bold">{activeLeads.length}</p>
        </div>
        <div className="geo-block rounded-sm bg-white dark:bg-card p-4 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Etapas
          </p>
          <p className="mt-1 text-xl font-bold">{PIPELINE_STAGES.length}</p>
        </div>
        <div className="geo-block rounded-sm bg-white dark:bg-card p-4 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Leads
          </p>
          <p className="mt-1 text-xl font-bold">{leads.length}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />

      {/* New Lead Dialog */}
      <NewLeadDialog open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}
```

---

### Task 3: Lead Detail Dialog

**Files:**
- Create: `components/crm/pipeline/lead-detail-dialog.tsx`
- Create: `components/crm/pipeline/activity-timeline.tsx`

- [ ] **Step 1: Create ActivityTimeline component**

```typescript
// components/crm/pipeline/activity-timeline.tsx
'use client';

import { Phone, Mail, MessageSquare, FileText, Calendar, type LucideIcon } from 'lucide-react';

interface Activity {
  id: string;
  tipo: 'llamada' | 'whatsapp' | 'email' | 'nota' | 'cita';
  descripcion: string;
  fecha: string;
  realizado_por?: string;
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  llamada: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  nota: FileText,
  cita: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  llamada: 'text-blue-600 bg-blue-100',
  whatsapp: 'text-green-600 bg-green-100',
  email: 'text-purple-600 bg-purple-100',
  nota: 'text-gray-600 bg-gray-100',
  cita: 'text-amber-600 bg-amber-100',
};

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Sin actividades registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, i) => {
        const Icon = ACTIVITY_ICONS[activity.tipo] || FileText;
        const colorClass = ACTIVITY_COLORS[activity.tipo] || 'text-gray-600 bg-gray-100';
        const isLast = i === activities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-3 pb-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}

            {/* Icon */}
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${colorClass}`}>
              <Icon className="size-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activity.descripcion}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {new Date(activity.fecha).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {activity.realizado_por && (
                  <>
                    <span className="text-[11px] text-muted-foreground/40">•</span>
                    <span className="text-[11px] text-muted-foreground">
                      {activity.realizado_por}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create LeadDetailDialog**

```typescript
// components/crm/pipeline/lead-detail-dialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ActivityTimeline } from './activity-timeline';
import { Phone, MessageSquare, Calendar, Edit3, Trash2 } from 'lucide-react';
import type { PipelineLead } from '@/lib/crm-api';

const ORIGEN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', web: 'Web', facebook: 'Facebook',
  instagram: 'Instagram', referido: 'Referido', presencial: 'Presencial',
};

interface LeadDetailDialogProps {
  lead: PipelineLead | null;
  onClose: () => void;
}

export function LeadDetailDialog({ lead, onClose }: LeadDetailDialogProps) {
  if (!lead) return null;

  // Mock activities until API is ready
  const mockActivities = [
    { id: '1', tipo: 'whatsapp' as const, descripcion: 'Mensaje de bienvenida enviado', fecha: lead.fecha_creacion, realizado_por: lead.vendedor_asignado_nombre },
    { id: '2', tipo: 'nota' as const, descripcion: lead.notas || 'Sin notas registradas', fecha: lead.fecha_ultimo_contacto || lead.fecha_creacion, realizado_por: lead.vendedor_asignado_nombre },
  ];

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{lead.nombre}</DialogTitle>
            {lead.origen && (
              <Badge variant="outline">{ORIGEN_LABELS[lead.origen] || lead.origen}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            {lead.telefono && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teléfono</p>
                <p className="text-sm flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {lead.telefono}
                </p>
              </div>
            )}
            {lead.email && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</p>
                <p className="text-sm">{lead.email}</p>
              </div>
            )}
            {lead.producto_interes && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interés</p>
                <p className="text-sm">{lead.producto_interes}</p>
              </div>
            )}
            {lead.valor_estimado && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor estimado</p>
                <p className="text-sm font-bold text-primary">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(lead.valor_estimado)}
                </p>
              </div>
            )}
          </div>

          <Separator className="divider-constructivist" />

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Phone className="size-3.5" /> Llamar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquare className="size-3.5" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="size-3.5" /> Agendar
            </Button>
          </div>

          <Separator className="divider-constructivist" />

          {/* Activity timeline */}
          <div>
            <h4 className="text-sm font-bold mb-3">Actividad reciente</h4>
            <ActivityTimeline activities={mockActivities} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 4: New Lead Dialog

**Files:**
- Create: `components/crm/pipeline/new-lead-dialog.tsx`

- [ ] **Step 1: Create NewLeadDialog**

```typescript
// components/crm/pipeline/new-lead-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCRMStore } from '@/stores/crm-store';
import { UserCheck, Import } from 'lucide-react';

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

const ORIGENES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referido', label: 'Referido' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'manual', label: 'Manual' },
];

const ETAPAS = [
  { value: 'lead_nuevo', label: 'Lead Nuevo' },
  { value: 'calificado', label: 'Calificado' },
  { value: 'cita_agendada', label: 'Cita Agendada' },
  { value: 'negociacion', label: 'Negociación' },
];

export function NewLeadDialog({ open, onClose }: NewLeadDialogProps) {
  const { addLead } = useCRMStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    origen: 'whatsapp',
    etapa: 'lead_nuevo',
    producto_interes: '',
    valor_estimado: '',
    notas: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    setIsSubmitting(true);
    try {
      await addLead({
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        origen: form.origen,
        producto_interes: form.producto_interes || undefined,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : undefined,
        notas: form.notas || undefined,
      });
      onClose();
      setForm({ nombre: '', telefono: '', email: '', origen: 'whatsapp', etapa: 'lead_nuevo', producto_interes: '', valor_estimado: '', notas: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nuevo Lead</DialogTitle>
          <DialogDescription>
            Creá un lead manualmente o importalo desde WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import from WhatsApp option */}
          <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
            <Import className="size-4 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium">Importar desde WhatsApp</p>
              <p className="text-[11px] text-muted-foreground">Seleccionar contacto de una conversación</p>
            </div>
          </Button>

          <Separator className="divider-constructivist" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Nombre del contacto"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="+54 11 5555-5555"
                  value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="origen">Origen</Label>
                <Select value={form.origen} onValueChange={v => setForm(f => ({ ...f, origen: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor estimado ($)</Label>
                <Input
                  id="valor"
                  type="number"
                  placeholder="50000"
                  value={form.valor_estimado}
                  onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="producto">Producto / Servicio de interés</Label>
              <Input
                id="producto"
                placeholder="Ej: Toyota Corolla, Plan Premium"
                value={form.producto_interes}
                onChange={e => setForm(f => ({ ...f, producto_interes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                placeholder="Observaciones iniciales..."
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !form.nombre.trim()}>
                {isSubmitting ? 'Creando...' : 'Crear Lead'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 5: Sidebar Navigation — CRM Link

**Files:**
- Modify: `components/layouts/dashboard-shell.tsx`

- [ ] **Step 1: Add CRM section to sidebar navigation**

In `dashboard-shell.tsx`, update `defaultSidebarItems`:

```typescript
const defaultSidebarItems: SidebarItem[] = [
  { label: "Panel", href: "/" },
  { label: "WhatsApp", href: "/whatsapp" },
  { label: "CRM", href: "/crm/pipeline" },
  { label: "Campañas", href: "/campaigns" },
  { label: "Contactos", href: "/contacts" },
  { label: "Automatizaciones", href: "/automations" },
  { label: "IA", href: "/settings/ai" },
  { label: "Anti-Ban", href: "/anti-ban" },
];
```

And ensure any route matching `href.startsWith("/crm")` also highlights correctly. Currently the `isActive` logic checks `pathname === item.href` or `pathname.startsWith(item.href)`. The CRM link should use `pathname.startsWith("/crm")` since it has sub-routes.

---

### Task 6: Documentación en Engram

**Files:**
- No files — Engram memory save

- [ ] **Step 1: Save architecture decision**

```typescript
mem_save({
  title: "CRM Pipeline — Componentes Creados",
  type: "architecture",
  topic_key: "crm/pipeline-components",
  capture_prompt: false,
  content: {
    what: "Pipeline Kanban con drag & drop, detalle de lead, nuevo lead dialog",
    where: "components/crm/pipeline/, app/(dashboard)/crm/pipeline/",
    learned: "Usar card-constructivist para mantener estilo. @dnd-kit con PointerSensor. Zustand store con optimistic updates y rollback.",
    communication: {
      store: "useCRMStore en stores/crm-store.ts",
      events: ["lead:moved", "lead:created", "lead:updated"],
      api: "lib/crm-api.ts con fetch directo a API NestJS",
    },
    next: "Fase 2: Calendario + Reglas de automatización"
  }
})
```
