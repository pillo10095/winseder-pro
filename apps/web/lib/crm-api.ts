import type { PipelineLead, PipelineStats, PipelineFilters } from '@/types/crm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ─── Pipeline Leads ───

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

export interface CreateLeadDto {
  name: string;
  value?: number;
  source?: string;
  contact_id?: string;
  notes?: string;
}

export async function createPipelineLead(dto: CreateLeadDto): Promise<PipelineLead> {
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

export async function movePipelineLead(id: string, pipelineStageId: string): Promise<PipelineLead> {
  const res = await fetch(`${API_URL}/crm/pipeline/${id}/move`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ pipeline_stage_id: pipelineStageId }),
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

// ─── Contacts ───

export async function fetchContacts(): Promise<any[]> {
  const res = await fetch(`${API_URL}/crm/contacts`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar contactos');
  const data = await res.json();
  return data.data ?? data ?? [];
}

// ─── Activities ───

export async function fetchActivities(dealId?: string): Promise<any[]> {
  const params = dealId ? `?deal_id=${dealId}` : '';
  const res = await fetch(`${API_URL}/crm/activities${params}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar actividades');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function createActivity(dto: {
  contact_id?: string;
  deal_id?: string;
  type: string;
  description: string;
  activity_date?: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/crm/activities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al crear actividad');
  return await res.json();
}
