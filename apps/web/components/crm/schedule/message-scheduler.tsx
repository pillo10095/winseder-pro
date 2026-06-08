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
import { CalendarIcon, Clock } from 'lucide-react';

interface MessageSchedulerProps {
  open: boolean;
  onClose: () => void;
  defaultContactId?: string;
  onSchedule: (data: {
    contacto_id?: string;
    contacto_nombre: string;
    mensaje: string;
    fecha_envio: string;
    hora_envio: string;
  }) => void;
}

export function MessageScheduler({
  open,
  onClose,
  defaultContactId,
  onSchedule,
}: MessageSchedulerProps) {
  const [form, setForm] = useState({
    contacto_id: defaultContactId || '',
    contacto_nombre: '',
    mensaje: '',
    fecha_envio: new Date().toISOString().split('T')[0],
    hora_envio: '09:00',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedule({
      contacto_id: form.contacto_id || undefined,
      contacto_nombre: form.contacto_nombre,
      mensaje: form.mensaje,
      fecha_envio: form.fecha_envio,
      hora_envio: form.hora_envio,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Programar Mensaje
          </DialogTitle>
          <DialogDescription>
            Elegí cuándo y a quién enviar el mensaje.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contacto */}
          <div className="space-y-2">
            <Label htmlFor="contacto_nombre">Contacto *</Label>
            <Input
              id="contacto_nombre"
              placeholder="Nombre del contacto"
              value={form.contacto_nombre}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  contacto_nombre: e.target.value,
                }))
              }
              required
            />
          </div>

          <Separator className="divider-constructivist" />

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha_envio">
                <CalendarIcon className="mr-1 inline size-3" />
                Fecha *
              </Label>
              <Input
                id="fecha_envio"
                type="date"
                value={form.fecha_envio}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    fecha_envio: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_envio">
                <Clock className="mr-1 inline size-3" />
                Hora
              </Label>
              <Input
                id="hora_envio"
                type="time"
                value={form.hora_envio}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    hora_envio: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <Separator className="divider-constructivist" />

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje *</Label>
            <Textarea
              id="mensaje"
              placeholder="Escribí el contenido del mensaje..."
              value={form.mensaje}
              onChange={e =>
                setForm(f => ({ ...f, mensaje: e.target.value }))
              }
              rows={5}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Se enviará vía WhatsApp si el contacto tiene sesión activa.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.contacto_nombre.trim() || !form.mensaje.trim()}
            >
              Programar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
