const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchRules(): Promise<any[]> {
  const res = await fetch(`${API_URL}/chatbot/automation-rule`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar reglas');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function createRule(dto: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_URL}/chatbot/automation-rule`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al crear regla');
  return await res.json();
}

export async function updateRule(
  id: string,
  dto: Record<string, any>
): Promise<void> {
  const res = await fetch(`${API_URL}/chatbot/automation-rule/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al actualizar regla');
}

export async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/chatbot/automation-rule/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar regla');
}
