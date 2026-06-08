export interface CalendarEvent {
  id: string;
  tipo: 'cita' | 'mensaje' | 'recordatorio';
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string;
  duracion_minutos?: number;
  contacto_id?: string;
  contacto_nombre?: string;
  deal_id?: string;
  plantilla_id?: string;
  estado?: 'pendiente' | 'enviado' | 'fallido' | 'completada' | 'cancelada';
  color?: string;
}

export const EVENT_TYPES = [
  { value: 'cita', label: 'Cita', color: '#3B82F6' },
  { value: 'mensaje', label: 'Mensaje Programado', color: '#22C55E' },
  { value: 'recordatorio', label: 'Recordatorio', color: '#F59E0B' },
] as const;

export const EVENT_COLORS: Record<string, string> = {
  cita: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
  mensaje: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
  recordatorio: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
};

export const EVENT_DOTS: Record<string, string> = {
  cita: 'bg-blue-500',
  mensaje: 'bg-green-500',
  recordatorio: 'bg-amber-500',
};
