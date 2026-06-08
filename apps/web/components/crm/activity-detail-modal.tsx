'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Handshake, FileText, CheckCircle, Pin, CheckCheck } from 'lucide-react';
import type { CalendarActivity } from '@/src/hooks/use-calendar';

const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Handshake,
  note: FileText,
  task: CheckCircle,
  whatsapp: Phone,
  system: Pin,
};

interface Props {
  activity: CalendarActivity | null;
  open: boolean;
  onClose: () => void;
  onComplete: (id: string) => Promise<void>;
  onEdit: (activity: CalendarActivity) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ActivityDetailModal({
  activity,
  open,
  onClose,
  onComplete,
  onEdit,
  onDelete,
}: Props) {
  const [completing, setCompleting] = useState(false);

  if (!activity) return null;

  const Icon = TYPE_ICONS[activity.type] || Pin;
  const isCompleted = !!activity.completed_at;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(activity.id);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="capitalize">{activity.type}</span>
            {isCompleted && (
              <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                Completada
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-foreground">{activity.description}</p>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {activity.contact_name && (
              <span>Contacto: {activity.contact_name}</span>
            )}
            {activity.deal_name && (
              <span>Negocio: {activity.deal_name}</span>
            )}
            <span>
              {new Date(activity.activity_date).toLocaleString('es-AR')}
            </span>
            {isCompleted && activity.completed_at && (
              <span className="text-emerald-600">
                Completado: {new Date(activity.completed_at).toLocaleString('es-AR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {activity.type === 'task' && (
            <Button
              size="sm"
              variant={isCompleted ? 'outline' : 'default'}
              onClick={handleComplete}
              disabled={completing}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              {isCompleted ? 'Desmarcar' : 'Marcar completada'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(activity)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(activity.id)}
          >
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
