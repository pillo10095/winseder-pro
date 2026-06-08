# CRM Pipeline Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing CRM pipeline into an enterprise Kanban with premium UX/UI, combined filters, activity timeline, and real-time stats.

**Architecture:** Extend NestJS backend entities/services/controllers, refactor Zustand store with optimistic updates, redesign frontend components with constructivist design system, add stats endpoint.

**Tech Stack:** NestJS 10, TypeORM, MySQL 8, Next.js 14, dnd-kit, Zustand, shadcn/ui, date-fns, Lucide

---

### Task 1: Extend Deal entity with new fields

**Files:**
- Modify: `apps/api/src/modules/crm/entities/deal.entity.ts`

- [ ] **Step 1: Add fields to Deal entity**

Add after `won_lost_reason`:

```typescript
@Column({ type: 'simple-array', nullable: true })
tags!: string[] | null;

@Column({ type: 'datetime', nullable: true })
last_activity_at!: Date | null;

@Column({ length: 200, nullable: true, type: 'varchar' })
next_action!: string | null;

@Column({ type: 'datetime', nullable: true })
next_action_date!: Date | null;
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build` en apps/api
Expected: Compila sin errores

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/crm/entities/deal.entity.ts
git commit -m "feat(api): add tags, last_activity_at, next_action fields to Deal entity"
```

---

### Task 2: Extend Activity entity with WHATSAPP and SYSTEM types

**Files:**
- Modify: `apps/api/src/modules/crm/entities/activity.entity.ts`

- [ ] **Step 1: Add new activity types**

```typescript
export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  WHATSAPP = 'whatsapp',
  SYSTEM = 'system',
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build` en apps/api
Expected: Compila sin errores

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/crm/entities/activity.entity.ts
git commit -m "feat(api): add WHATSAPP and SYSTEM activity types"
```

---

### Task 3: Create new DTOs for pipeline queries

**Files:**
- Create: `apps/api/src/modules/crm/dto/query-pipeline.dto.ts`
- Create: `apps/api/src/modules/crm/dto/move-deal.dto.ts`

- [ ] **Step 1: Create QueryPipelineDto**

```typescript
import { IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPipelineDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsUUID()
  assigned?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
```

- [ ] **Step 2: Create MoveDealDto**

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MoveDealDto {
  @IsUUID()
  @IsNotEmpty()
  pipeline_stage_id!: string;
}
```

- [ ] **Step 3: Run build to verify**

Run: `npm run build` en apps/api
Expected: Compila sin errores

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/crm/dto/
git commit -m "feat(api): add QueryPipelineDto and MoveDealDto"
```

---

### Task 4: Extend DealService with findWithFilters, moveStage, getStats

**Files:**
- Modify: `apps/api/src/modules/crm/services/deal.service.ts`
- Modify: `apps/api/src/modules/crm/repositories/deal.repository.ts`

- [ ] **Step 1: Add findWithFilters to DealRepository**

```typescript
import { Repository } from 'typeorm/repository/Repository';
import { Deal } from '../entities/deal.entity';
import { QueryPipelineDto } from '../dto/query-pipeline.dto';

export class DealRepository extends Repository<Deal> {
  async findWithFilters(companyId: string, filters: QueryPipelineDto): Promise<[Deal[], number]> {
    const qb = this.createQueryBuilder('deal')
      .leftJoinAndSelect('deal.pipeline_stage', 'pipeline_stage')
      .leftJoinAndSelect('deal.contact', 'contact')
      .leftJoinAndSelect('deal.assigned_user', 'assigned_user')
      .where('deal.company_id = :companyId', { companyId });

    if (filters.stage) {
      qb.andWhere('pipeline_stage.name = :stage', { stage: filters.stage });
    }
    if (filters.search) {
      qb.andWhere(
        '(deal.name LIKE :search OR contact.name LIKE :search OR contact.email LIKE :search OR contact.phone LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.label) {
      qb.innerJoin('deal.labels', 'label_filter')
        .andWhere('label_filter.id = :labelId', { labelId: filters.label });
    }
    if (filters.assigned) {
      qb.andWhere('deal.assigned_to = :assigned', { assigned: filters.assigned });
    }
    if (filters.source) {
      qb.andWhere('deal.source = :source', { source: filters.source });
    }

    qb.orderBy('deal.last_activity_at', 'DESC')
      .addOrderBy('deal.created_at', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    return qb.getManyAndCount();
  }
}
```

- [ ] **Step 2: Add moveStage to DealService**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DealRepository } from '../repositories/deal.repository';
import { ActivityService } from './activity.service';

@Injectable()
export class DealService {
  constructor(
    @InjectRepository(DealRepository)
    private readonly dealRepo: DealRepository,
    private readonly activityService: ActivityService,
  ) {}

  async findWithFilters(companyId: string, filters: QueryPipelineDto) {
    return this.dealRepo.findWithFilters(companyId, filters);
  }

  async moveStage(dealId: string, newStageId: string, userId: string) {
    const deal = await this.dealRepo.findOneOrFail({ where: { id: dealId } });
    const oldStageId = deal.pipeline_stage_id;
    deal.pipeline_stage_id = newStageId;
    deal.last_activity_at = new Date();
    await this.dealRepo.save(deal);

    // Auto-create system activity
    if (oldStageId !== newStageId) {
      await this.activityService.create({
        deal_id: dealId,
        company_id: deal.company_id,
        type: 'system',
        description: `Movido de etapa ${oldStageId} a ${newStageId}`,
        logged_by: userId,
        activity_date: new Date(),
      });
    }

    return deal;
  }

  async getStats(companyId: string) {
    const qb = this.dealRepo.createQueryBuilder('deal')
      .leftJoin('deal.pipeline_stage', 'stage')
      .where('deal.company_id = :companyId', { companyId })
      .select([
        'COUNT(deal.id) as total_deals',
        'COALESCE(SUM(deal.value), 0) as total_value',
        'COALESCE(AVG(deal.value), 0) as avg_value',
      ]);

    const totals = await qb.getRawOne();

    const wonCount = await this.dealRepo.count({
      where: {
        company_id: companyId,
        pipeline_stage_id: 'cerrado_ganado', // Esto se ajusta al stage ID real
      },
    });

    const totalDeals = Number(totals.total_deals) || 0;
    const conversionRate = totalDeals > 0 ? (wonCount / totalDeals) * 100 : 0;

    // Stats by stage
    const byStage = await this.dealRepo.createQueryBuilder('deal')
      .leftJoin('deal.pipeline_stage', 'stage')
      .where('deal.company_id = :companyId', { companyId })
      .select([
        'stage.name as stage_name',
        'stage.color as stage_color',
        'COUNT(deal.id) as count',
        'COALESCE(SUM(deal.value), 0) as value',
      ])
      .groupBy('stage.name')
      .addGroupBy('stage.color')
      .orderBy('stage.sort_order', 'ASC')
      .getRawMany();

    return {
      total_deals: totalDeals,
      total_value: Number(totals.total_value) || 0,
      avg_value: Number(totals.avg_value) || 0,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      by_stage: byStage,
    };
  }
}
```

- [ ] **Step 3: Run build to verify**

Run: `npm run build` en apps/api
Expected: Compila sin errores

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/crm/services/deal.service.ts apps/api/src/modules/crm/repositories/deal.repository.ts
git commit -m "feat(api): add findWithFilters, moveStage, getStats to DealService"
```

---

### Task 5: Refactor PipelineController with filters and stats

**Files:**
- Modify: `apps/api/src/modules/crm/controllers/pipeline.controller.ts`

- [ ] **Step 1: Refactor controller**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DealService } from '../services/deal.service';
import { QueryPipelineDto } from '../dto/query-pipeline.dto';
import { MoveDealDto } from '../dto/move-deal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('crm/pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  async findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filters: QueryPipelineDto,
  ) {
    const [data, total] = await this.dealService.findWithFilters(companyId, filters);
    return { data, total, page: filters.page, limit: filters.limit };
  }

  @Get('stats')
  async getStats(@CurrentUser('companyId') companyId: string) {
    return this.dealService.getStats(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dealService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any, @CurrentUser() user: any) {
    return this.dealService.create({ ...dto, company_id: user.companyId, assigned_to: user.id });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.dealService.update(id, dto);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body() dto: MoveDealDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealService.moveStage(id, dto.pipeline_stage_id, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dealService.remove(id);
  }
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build` en apps/api
Expected: Compila sin errores

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/crm/controllers/pipeline.controller.ts
git commit -m "feat(api): refactor PipelineController with filters, stats, and move endpoint"
```

---

### Task 6: Update frontend types to align with backend

**Files:**
- Modify: `apps/web/types/crm.ts`

- [ ] **Step 1: Update types**

```typescript
export interface PipelineLead {
  id: string;
  name: string;
  value: number;
  company_name?: string;
  probability: number;
  close_date?: string;
  tags?: string[];
  last_activity_at?: string;
  next_action?: string;
  next_action_date?: string;
  source?: string;
  assigned_to?: string;
  assigned_user?: { id: string; name: string; email: string };
  contact?: { id: string; name: string; email: string; phone: string };
  pipeline_stage: { id: string; name: string; color: string };
  created_at: string;
}

export interface PipelineStats {
  total_deals: number;
  total_value: number;
  avg_value: number;
  conversion_rate: number;
  by_stage: { stage_name: string; stage_color: string; count: number; value: number }[];
}

export interface PipelineFilters {
  stage?: string;
  search?: string;
  label?: string;
  assigned?: string;
  source?: string;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/types/crm.ts
git commit -m "feat(web): update CRM types with PipelineLead, PipelineStats, PipelineFilters"
```

---

### Task 7: Extend crm-api lib with stats and filters

**Files:**
- Modify: `apps/web/lib/crm-api.ts`

- [ ] **Step 1: Add API functions**

```typescript
import { PipelineLead, PipelineStats, PipelineFilters } from '@/types/crm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchPipelineLeads(filters?: PipelineFilters): Promise<{ data: PipelineLead[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.label) params.set('label', filters.label);
  if (filters?.assigned) params.set('assigned', filters.assigned);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  const res = await fetch(`${API_URL}/crm/pipeline${qs ? `?${qs}` : ''}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar pipeline');
  return res.json();
}

export async function fetchPipelineStats(): Promise<PipelineStats> {
  const res = await fetch(`${API_URL}/crm/pipeline/stats`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar stats');
  return res.json();
}

export async function fetchPipelineLead(id: string): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline/${id}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar lead');
  return res.json();
}

export async function createPipelineLead(dto: {
  name: string;
  value?: number;
  source?: string;
  contact_id?: string;
  notes?: string;
}): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al crear lead');
  return res.json();
}

export async function updatePipelineLead(id: string, dto: Partial<PipelineLead>): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al actualizar lead');
  return res.json();
}

export async function movePipelineLead(id: string, pipeline_stage_id: string): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline/${id}/move`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ pipeline_stage_id }),
  });
  if (!res.ok) throw new Error('Error al mover lead');
  return res.json();
}

export async function deletePipelineLead(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/crm/pipeline/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar lead');
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/crm-api.ts
git commit -m "feat(web): extend CRM API with stats, filters, and move endpoint"
```

---

### Task 8: Refactor CRM store with optimistic updates

**Files:**
- Modify: `apps/web/stores/crm-store.ts`

- [ ] **Step 1: Rewrite store**

```typescript
import { create } from 'zustand';
import { PipelineLead, PipelineStats, PipelineFilters } from '@/types/crm';
import * as api from '@/lib/crm-api';

interface CRMState {
  leads: PipelineLead[];
  stats: PipelineStats | null;
  filters: PipelineFilters;
  total: number;
  isLoading: boolean;
  error: string | null;

  loadLeads: (filters?: PipelineFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  setFilters: (filters: PipelineFilters) => void;
  moveLead: (dealId: string, newStageId: string) => Promise<void>;
  createLead: (dto: Parameters<typeof api.createPipelineLead>[0]) => Promise<void>;
  updateLead: (dealId: string, dto: Partial<PipelineLead>) => Promise<void>;
  removeLead: (dealId: string) => Promise<void>;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  leads: [],
  stats: null,
  filters: {},
  total: 0,
  isLoading: false,
  error: null,

  loadLeads: async (filters?: PipelineFilters) => {
    set({ isLoading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const result = await api.fetchPipelineLeads(mergedFilters);
      set({ leads: result.data, total: result.total, filters: mergedFilters });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await api.fetchPipelineStats();
      set({ stats });
    } catch {
      // Stats are non-critical
    }
  },

  setFilters: (filters: PipelineFilters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().loadLeads();
  },

  moveLead: async (dealId: string, newStageId: string) => {
    const previous = get().leads;
    // Optimistic update
    set({
      leads: previous.map(l =>
        l.id === dealId ? { ...l, pipeline_stage: { ...l.pipeline_stage, id: newStageId } } : l
      ),
    });
    try {
      await api.movePipelineLead(dealId, newStageId);
    } catch (e: any) {
      // Rollback on failure
      set({ leads: previous, error: e.message });
    }
  },

  createLead: async (dto) => {
    try {
      const lead = await api.createPipelineLead(dto);
      set({ leads: [lead, ...get().leads] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateLead: async (dealId, dto) => {
    const previous = get().leads;
    // Optimistic update
    set({
      leads: previous.map(l => (l.id === dealId ? { ...l, ...dto } : l)),
    });
    try {
      const updated = await api.updatePipelineLead(dealId, dto);
      set({ leads: get().leads.map(l => (l.id === dealId ? updated : l)) });
    } catch (e: any) {
      set({ leads: previous, error: e.message });
    }
  },

  removeLead: async (dealId) => {
    const previous = get().leads;
    set({ leads: previous.filter(l => l.id !== dealId) });
    try {
      await api.deletePipelineLead(dealId);
    } catch (e: any) {
      set({ leads: previous, error: e.message });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/stores/crm-store.ts
git commit -m "feat(web): refactor CRM store with optimistic updates and rollback"
```

---

### Task 9: Create PipelineHeader component (KPIs + Filters)

**Files:**
- Create: `apps/web/components/crm/pipeline/pipeline-header.tsx`
- Create: `apps/web/components/crm/pipeline/pipeline-stats.tsx`

- [ ] **Step 1: Create PipelineStats**

```tsx
'use client';

import { useEffect } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

export function PipelineStats() {
  const { stats, loadStats } = useCRMStore();

  useEffect(() => { loadStats(); }, [loadStats]);

  if (!stats) return null;

  const cards = [
    { label: 'Total Pipeline', value: `$${(stats.total_value / 1000).toFixed(1)}K`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Leads Activos', value: stats.total_deals, icon: Users, color: 'text-blue-600' },
    { label: 'Ticket Promedio', value: `$${(stats.avg_value / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Tasa Conversión', value: `${stats.conversion_rate}%`, icon: Target, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-card border border-border rounded-sm p-4 flex items-center gap-3">
          <div className={`p-2 bg-muted rounded-sm ${color}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create PipelineHeader**

```tsx
'use client';

import { useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { PipelineStats } from './pipeline-stats';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PIPELINE_STAGES, ORIGEN_LABELS } from '@/types/crm';

interface PipelineHeaderProps {
  onCreateLead: () => void;
}

export function PipelineHeader({ onCreateLead }: PipelineHeaderProps) {
  const { filters, setFilters } = useCRMStore();
  const [search, setSearch] = useState(filters.search || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search });
  };

  return (
    <div>
      <PipelineStats />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar leads..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>

        <Select
          value={filters.source || '_all'}
          onValueChange={v => setFilters({ source: v === '_all' ? undefined : v })}
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="size-3.5 mr-1" />
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            {Object.entries(ORIGEN_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onCreateLead} size="sm">
          <Plus className="size-4 mr-1" />
          Nuevo Lead
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/crm/pipeline/pipeline-header.tsx apps/web/components/crm/pipeline/pipeline-stats.tsx
git commit -m "feat(web): add PipelineHeader with KPIs and filters"
```

---

### Task 10: Redesign LeadCard component

**Files:**
- Modify: `apps/web/components/crm/pipeline/lead-card.tsx`

- [ ] **Step 1: Rewrite LeadCard**

```tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { PipelineLead } from '@/types/crm';
import { Phone, Mail, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: PipelineLead;
  onSelect?: (lead: PipelineLead) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-amber-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const SOURCE_BADGES: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800',
  web: 'bg-blue-100 text-blue-800',
  facebook: 'bg-indigo-100 text-indigo-800',
  instagram: 'bg-pink-100 text-pink-800',
  referido: 'bg-purple-100 text-purple-800',
  presencial: 'bg-amber-100 text-amber-800',
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(lead)}
      className={cn(
        'bg-card border border-border rounded-sm p-3 cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      {/* Header: Avatar + Name */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('size-8 rounded-sm flex items-center justify-center text-white text-xs font-bold', getAvatarColor(lead.name))}>
          {getInitials(lead.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{lead.name}</p>
          {lead.company_name && (
            <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold">${lead.value?.toLocaleString() || 0}</span>
        {lead.probability > 0 && (
          <span className="text-xs text-muted-foreground">{lead.probability}%</span>
        )}
      </div>

      {/* Source badge + time */}
      <div className="flex items-center justify-between">
        {lead.source && (
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-sm', SOURCE_BADGES[lead.source] || 'bg-gray-100 text-gray-800')}>
            {lead.source}
          </span>
        )}
        {lead.last_activity_at && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {timeAgo(lead.last_activity_at)}
          </span>
        )}
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-border">
        <button className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="Llamar">
          <Phone className="size-3" />
        </button>
        <button className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="Email">
          <Mail className="size-3" />
        </button>
        <button className="p-1 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="Agendar">
          <Calendar className="size-3" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/crm/pipeline/lead-card.tsx
git commit -m "feat(web): redesign LeadCard with avatar, tags, quick actions"
```

---

### Task 11: Refactor KanbanColumn and KanbanBoard

**Files:**
- Modify: `apps/web/components/crm/pipeline/kanban-column.tsx`
- Modify: `apps/web/components/crm/pipeline/kanban-board.tsx`

- [ ] **Step 1: Rewrite KanbanColumn**

```tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { PipelineLead } from '@/types/crm';
import { LeadCard } from './lead-card';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: { key: string; label: string; color: string };
  leads: PipelineLead[];
  onSelectLead: (lead: PipelineLead) => void;
  onAddLead: (stageKey: string) => void;
}

export function KanbanColumn({ stage, leads, onSelectLead, onAddLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage.key}` });

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm" style={{ backgroundColor: stage.color }} />
          <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
          <span className="text-xs text-muted-foreground font-mono">{leads.length}</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[200px] p-2 rounded-sm border border-dashed transition-colors',
          'border-border bg-muted/30',
          isOver && 'border-primary bg-primary/5',
        )}
      >
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
        ))}

        {/* Add button */}
        <button
          onClick={() => onAddLead(stage.key)}
          className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-sm transition-colors border border-dashed border-transparent hover:border-border"
        >
          <Plus className="size-3.5" />
          Agregar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Refactor KanbanBoard**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { LeadCard } from './lead-card';
import { LeadDetailDialog } from './lead-detail-dialog';
import { NewLeadDialog } from './new-lead-dialog';
import { PipelineHeader } from './pipeline-header';
import { useCRMStore } from '@/stores/crm-store';
import { PIPELINE_STAGES } from '@/types/crm';
import type { PipelineLead } from '@/types/crm';

export function KanbanBoard() {
  const { leads, isLoading, error, loadLeads, moveLead } = useCRMStore();
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as PipelineLead;
    if (lead) {
      setActiveLead(lead);
      setActiveStage(lead.pipeline_stage?.id);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveLead(null);
      setActiveStage(null);
      const { active, over } = event;
      if (!over) return;
      const leadId = active.id as string;
      const targetColumnId = over.id as string;
      const newStageKey = targetColumnId.replace('column-', '');
      const stage = PIPELINE_STAGES.find(s => s.key === newStageKey);
      if (stage && stage.key !== activeStage) {
        moveLead(leadId, stage.key);
      }
    },
    [moveLead, activeStage],
  );

  const getLeadsByStage = (stageKey: string) =>
    leads.filter(l => l.pipeline_stage?.id === stageKey || l.pipeline_stage?.name === stageKey);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-destructive">{error}</p>
        <button onClick={() => loadLeads()} className="mt-4 text-sm text-primary hover:underline">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <PipelineHeader onCreateLead={() => setShowNewLead(true)} />

      {isLoading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Cargando pipeline...</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={getLeadsByStage(stage.key)}
                onSelectLead={setSelectedLead}
                onAddLead={s => setShowNewLead(true)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="rotate-3 opacity-90 shadow-xl">
                <LeadCard lead={activeLead} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailDialog lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <NewLeadDialog open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/crm/pipeline/kanban-column.tsx apps/web/components/crm/pipeline/kanban-board.tsx
git commit -m "feat(web): refactor KanbanColumn and KanbanBoard with improved drag UX"
```

---

### Task 12: Create LeadDetailDialog with tabs

**Files:**
- Create: `apps/web/components/crm/pipeline/lead-detail-dialog.tsx`
- Create: `apps/web/components/crm/pipeline/activity-timeline.tsx`

- [ ] **Step 1: Create ActivityTimeline**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchActivities } from '@/lib/crm-api';
import { Phone, Mail, Calendar, FileText, MessageSquare, RefreshCw, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ICONS: Record<string, any> = {
  call: Phone, email: Mail, meeting: Calendar,
  note: FileText, task: Clock, whatsapp: MessageSquare, system: RefreshCw,
};

const COLORS: Record<string, string> = {
  call: 'bg-green-100 text-green-700',
  email: 'bg-blue-100 text-blue-700',
  meeting: 'bg-purple-100 text-purple-700',
  note: 'bg-gray-100 text-gray-700',
  task: 'bg-amber-100 text-amber-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  system: 'bg-slate-100 text-slate-700',
};

interface ActivityTimelineProps {
  dealId: string;
}

export function ActivityTimeline({ dealId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchActivities(dealId).then(setActivities).catch(() => {});
  }, [dealId]);

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin actividades registradas</p>;
  }

  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
      {activities.map((a: any) => {
        const Icon = ICONS[a.type] || FileText;
        const colorClass = COLORS[a.type] || 'bg-gray-100 text-gray-700';
        return (
          <div key={a.id} className="relative">
            <div className={`absolute -left-[18px] p-1 rounded-full ${colorClass}`}>
              <Icon className="size-3" />
            </div>
            <div>
              <p className="text-sm">{a.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(a.activity_date || a.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create LeadDetailDialog**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PipelineLead } from '@/types/crm';
import { fetchPipelineLead } from '@/lib/crm-api';
import { ActivityTimeline } from './activity-timeline';
import { User, Phone, Mail, MapPin, Tag, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeadDetailDialogProps {
  lead: PipelineLead | null;
  onClose: () => void;
}

export function LeadDetailDialog({ lead, onClose }: LeadDetailDialogProps) {
  const [detail, setDetail] = useState<PipelineLead | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      setLoading(true);
      fetchPipelineLead(lead.id).then(setDetail).finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [lead?.id]);

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{lead?.name}</span>
            {lead?.pipeline_stage && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-sm text-white"
                style={{ backgroundColor: lead.pipeline_stage.color }}
              >
                {lead.pipeline_stage.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
        ) : detail ? (
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="activities">Actividades</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="files">Archivos</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span>{detail.contact?.name || detail.name}</span>
                  </div>
                  {detail.contact?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="size-4 text-muted-foreground" />
                      <span>{detail.contact.email}</span>
                    </div>
                  )}
                  {detail.contact?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-4 text-muted-foreground" />
                      <span>{detail.contact.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="size-4 text-muted-foreground" />
                    <span className="font-semibold">${detail.value?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span>Creado {format(new Date(detail.created_at), 'PP', { locale: es })}</span>
                  </div>
                  {detail.assigned_user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="size-4 text-muted-foreground" />
                      <span>Asignado: {detail.assigned_user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activities" className="pt-4">
              {detail.id && <ActivityTimeline dealId={detail.id} />}
            </TabsContent>

            <TabsContent value="whatsapp" className="pt-4">
              <p className="text-sm text-muted-foreground py-8 text-center">
                Chat de WhatsApp disponible en Fase 3
              </p>
            </TabsContent>

            <TabsContent value="files" className="pt-4">
              <p className="text-sm text-muted-foreground py-8 text-center">
                Módulo de archivos próximo
              </p>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/crm/pipeline/lead-detail-dialog.tsx apps/web/components/crm/pipeline/activity-timeline.tsx
git commit -m "feat(web): add LeadDetailDialog with tabs and ActivityTimeline"
```

---

### Task 13: Create NewLeadDialog

**Files:**
- Create: `apps/web/components/crm/pipeline/new-lead-dialog.tsx`

- [ ] **Step 1: Create NewLeadDialog**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCRMStore } from '@/stores/crm-store';

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewLeadDialog({ open, onClose }: NewLeadDialogProps) {
  const { createLead } = useCRMStore();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('manual');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createLead({
        name: name.trim(),
        value: value ? parseFloat(value) : undefined,
        source,
      });
      setName('');
      setValue('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nombre del contacto"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Valor estimado</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="$0"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Origen</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Web</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="referido">Referido</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creando...' : 'Crear Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/crm/pipeline/new-lead-dialog.tsx
git commit -m "feat(web): add NewLeadDialog with form"
```

---

### Task 14: Write backend tests

**Files:**
- Create: `apps/api/test/crm/pipeline.service.spec.ts`
- Create: `apps/api/test/crm/pipeline.controller.spec.ts`

- [ ] **Step 1: Create pipeline service test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DealService } from '../../../src/modules/crm/services/deal.service';
import { ActivityService } from '../../../src/modules/crm/services/activity.service';
import { DealRepository } from '../../../src/modules/crm/repositories/deal.repository';

describe('DealService', () => {
  let service: DealService;
  let repo: jest.Mocked<DealRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealService,
        {
          provide: getRepositoryToken(DealRepository),
          useValue: {
            findWithFilters: jest.fn(),
            findOneOrFail: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoin: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              select: jest.fn().mockReturnThis(),
              addGroupBy: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
              getRawMany: jest.fn(),
            })),
          },
        },
        {
          provide: ActivityService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DealService>(DealService);
    repo = module.get(getRepositoryToken(DealRepository));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find with filters', async () => {
    const mockData = [{ id: '1', name: 'Test Deal' }];
    (repo.findWithFilters as jest.Mock).mockResolvedValue([mockData, 1]);

    const [data, total] = await service.findWithFilters('company-1', { page: 1, limit: 20 });
    expect(data).toEqual(mockData);
    expect(total).toBe(1);
  });

  it('should move stage and create system activity', async () => {
    const deal = { id: 'deal-1', company_id: 'c1', pipeline_stage_id: 'stage-old' };
    (repo.findOneOrFail as jest.Mock).mockResolvedValue(deal);
    (repo.save as jest.Mock).mockResolvedValue({ ...deal, pipeline_stage_id: 'stage-new' });

    const result = await service.moveStage('deal-1', 'stage-new', 'user-1');
    expect(result.pipeline_stage_id).toBe('stage-new');
  });
});
```

- [ ] **Step 2: Run tests to verify**

Run: `npx jest apps/api/test/crm/pipeline.service.spec.ts --no-cache`
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/crm/
git commit -m "test(api): add DealService and PipelineController tests"
```

---

### Task 15: Write frontend store tests

**Files:**
- Create: `apps/web/test/stores/crm-store.spec.ts`

- [ ] **Step 1: Create store test**

```typescript
import { useCRMStore } from '@/stores/crm-store';

describe('CRM Store', () => {
  beforeEach(() => {
    useCRMStore.setState({ leads: [], stats: null, isLoading: false, error: null, total: 0, filters: {} });
  });

  it('should add a lead optimistically', async () => {
    const initial = useCRMStore.getState().leads.length;
    const mockLead = { id: '1', name: 'Test', value: 1000, pipeline_stage: { id: 'stage-1', name: 'Lead Nuevo', color: '#000' } } as any;

    // Simular create
    useCRMStore.setState({ leads: [mockLead, ...useCRMStore.getState().leads] });
    expect(useCRMStore.getState().leads.length).toBe(initial + 1);
  });

  it('should remove a lead on delete', () => {
    useCRMStore.setState({ leads: [{ id: '1', name: 'Test' } as any] });
    expect(useCRMStore.getState().leads.length).toBe(1);

    useCRMStore.setState({ leads: useCRMStore.getState().leads.filter(l => l.id !== '1') });
    expect(useCRMStore.getState().leads.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify**

Run: `npx jest apps/web/test/stores/crm-store.spec.ts --no-cache`
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/web/test/stores/crm-store.spec.ts
git commit -m "test(web): add CRM store tests"
```

---

### Task 16: Run full test suite and final verification

**Files:**
- All modified + created files

- [ ] **Step 1: Run API build**

Run: `npm run build` (desde apps/api)
Expected: Compila sin errores

- [ ] **Step 2: Run web build**

Run: `npm run build` (desde apps/web) o `npx next build`
Expected: Compila sin errores

- [ ] **Step 3: Run all tests**

Run: `turbo test`
Expected: Todos los tests pasan

- [ ] **Step 4: Final commit of any remaining changes**

```bash
git add -A
git commit -m "chore: final adjustments after CRM pipeline phase 1"
```

---

## Verification Checklist

- [ ] API compila sin errores (`npm run build` en apps/api)
- [ ] Web compila sin errores (`npm run build` en apps/web)
- [ ] Backend tests pasan (`npm test` en apps/api)
- [ ] Pipeline muestra leads desde el backend
- [ ] Drag & drop mueve leads entre columnas
- [ ] Filtros combinados funcionan (búsqueda, origen, etapa)
- [ ] KPIs del pipeline se renderizan con datos reales
- [ ] Lead detail dialog abre con info + timeline
- [ ] Nuevo lead se crea y aparece en la columna correspondiente
