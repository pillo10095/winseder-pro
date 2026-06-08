const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function fetchScheduledMessages(): Promise<any[]> {
  const res = await fetch(`${API_URL}/whatsapp/scheduled`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar mensajes programados');
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function scheduleMessage(
  dto: Record<string, any>
): Promise<any> {
  const res = await fetch(`${API_URL}/whatsapp/scheduled`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Error al programar mensaje');
  return await res.json();
}

export async function cancelScheduledMessage(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/whatsapp/scheduled/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cancelar mensaje');
}
