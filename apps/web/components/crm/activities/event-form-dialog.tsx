'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export function EventFormDialog({
  open,
  onClose,
  defaultDate,
  onSave,
}: EventFormDialogProps) {
  const [form, setForm] = useState({
    tipo: 'cita',
    titulo: '',
    descripcion: '',
    fecha: defaultDate || new Date().toISOString().split('T')[0],
    hora: '10:00',
    duracion_minutos: '60',
    contacto_nombre: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tipo: form.tipo as 'cita' | 'mensaje' | 'recordatorio',
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      fecha: form.fecha,
      hora: form.hora || undefined,
      duracion_minutos:
        form.tipo === 'cita' ? Number(form.duracion_minutos) : undefined,
      contacto_nombre: form.contacto_nombre || undefined,
      estado: 'pendiente',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Nuevo Evento
          </DialogTitle>
          <DialogDescription>
            Programá una cita, mensaje o recordatorio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo selector */}
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
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Ej: Test Drive Toyota Corolla"
              value={form.titulo}
              onChange={e =>
                setForm(f => ({ ...f, titulo: e.target.value }))
              }
              required
            />
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={e =>
                  setForm(f => ({ ...f, fecha: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={form.hora}
                onChange={e =>
                  setForm(f => ({ ...f, hora: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-2">
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="Nombre del contacto"
              value={form.contacto_nombre}
              onChange={e =>
                setForm(f => ({ ...f, contacto_nombre: e.target.value }))
              }
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Detalles del evento..."
              value={form.descripcion}
              onChange={e =>
                setForm(f => ({ ...f, descripcion: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!form.titulo.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
