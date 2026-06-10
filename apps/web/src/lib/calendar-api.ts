const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchActivities(params?: {
  contact_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<any[]> {
  const search = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';
  const res = await fetch(`${API_URL}/crm/activities${search}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar actividades');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function createActivity(dto: {
  contact_id?: string;
  deal_id?: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/crm/activities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al crear actividad');
  return await res.json();
}

export async function updateActivity(
  id: string,
  dto: Record<string, any>
): Promise<void> {
  const res = await fetch(`${API_URL}/crm/activities/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al actualizar actividad');
}

export async function deleteActivity(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/crm/activities/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar actividad');
}
