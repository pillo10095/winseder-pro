// ─── Pipeline Stages ───

export const PIPELINE_STAGES = [
  { key: 'lead_nuevo', label: 'Lead Nuevo', color: '#6B7280' },
  { key: 'calificado', label: 'Calificado', color: '#3B82F6' },
  { key: 'cita_agendada', label: 'Cita Agendada', color: '#8B5CF6' },
  { key: 'negociacion', label: 'Negociación', color: '#F59E0B' },
  { key: 'cerrado_ganado', label: 'Cerrado Ganado', color: '#22C55E' },
  { key: 'cerrado_perdido', label: 'Cerrado Perdido', color: '#EF4444' },
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key'];

export const STAGE_BG_COLORS: Record<string, string> = {
  lead_nuevo: 'bg-gray-100',
  calificado: 'bg-blue-100',
  cita_agendada: 'bg-purple-100',
  negociacion: 'bg-amber-100',
  cerrado_ganado: 'bg-green-100',
  cerrado_perdido: 'bg-red-100',
};

export const ORIGEN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  web: 'Web',
  facebook: 'Facebook',
  instagram: 'Instagram',
  referido: 'Referido',
  presencial: 'Presencial',
  manual: 'Manual',
};

export const ORIGEN_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  web: 'bg-blue-100 text-blue-800',
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  referido: 'bg-purple-100 text-purple-800',
  presencial: 'bg-amber-100 text-amber-800',
  manual: 'bg-gray-100 text-gray-800',
};

// ─── Pipeline Lead (Deal + nested relations) ───

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sort_order?: number;
}

export interface PipelineContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  company_name?: string;
}

export interface PipelineUser {
  id: string;
  name: string;
  email?: string;
}

export interface PipelineLead {
  id: string;
  name: string;
  value: number;
  company_name?: string;
  probability: number;
  close_date?: string;
  pipeline_stage_id: string;
  pipeline_stage?: PipelineStage;
  assigned_to?: string;
  assigned_user?: PipelineUser;
  contact_id?: string;
  contact?: PipelineContact;
  tags?: string[];
  last_activity_at?: string;
  next_action?: string;
  next_action_date?: string;
  won_lost_reason?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

// ─── Stats ───

export interface StageStat {
  stage_name: string;
  stage_color: string;
  count: number;
  value: number;
}

export interface PipelineStats {
  total_deals: number;
  total_value: number;
  avg_value: number;
  conversion_rate: number;
  by_stage: StageStat[];
}

// ─── Filters ───

export interface PipelineFilters {
  stage?: string;
  search?: string;
  label?: string;
  assigned?: string;
  source?: string;
  page?: number;
  limit?: number;
}

// ─── Helpers ───

export function getLeadName(lead: PipelineLead): string {
  return lead.name;
}

export function getLeadPhone(lead: PipelineLead): string | undefined {
  return lead.contact?.phone;
}

export function getLeadEmail(lead: PipelineLead): string | undefined {
  return lead.contact?.email;
}

export function getLeadSource(lead: PipelineLead): string | undefined {
  return lead.contact?.source;
}

export function getLeadNotes(lead: PipelineLead): string | undefined {
  return lead.contact?.notes;
}

export function getLeadAssignedName(lead: PipelineLead): string | undefined {
  return lead.assigned_user?.name;
}

export function getLeadStageKey(lead: PipelineLead): string {
  return lead.pipeline_stage_id || lead.pipeline_stage?.id || '';
}

export function getLeadStageName(lead: PipelineLead): string {
  return lead.pipeline_stage?.name || '';
}

export function getLeadValue(lead: PipelineLead): number {
  return typeof lead.value === 'number' ? lead.value : Number(lead.value) || 0;
}

export function getDaysSince(dateStr?: string): string {
  if (!dateStr) return 'Sin actividad';
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

export function formatCurrency(value?: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}
