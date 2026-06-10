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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useCRMStore } from '@/stores/pipeline-store';
import { Import } from 'lucide-react';

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

const SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referido', label: 'Referido' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'manual', label: 'Manual' },
];

export function NewLeadDialog({ open, onClose }: NewLeadDialogProps) {
  const { createLead } = useCRMStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    source: 'whatsapp',
    value: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createLead({
        name: form.name,
        source: form.source,
        value: form.value ? Number(form.value) : undefined,
        notes: form.notes || undefined,
      });
      onClose();
      setForm({
        name: '',
        source: 'whatsapp',
        value: '',
        notes: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nuevo Lead</DialogTitle>
          <DialogDescription>
            Creá un lead manualmente o importalo desde WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* WhatsApp import */}
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-2 py-3"
          >
            <Import className="size-4 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium">
                Importar desde WhatsApp
              </p>
              <p className="text-[11px] text-muted-foreground">
                Seleccionar contacto de una conversación
              </p>
            </div>
          </Button>

          <Separator className="divider-constructivist" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Nombre del contacto"
                value={form.name}
                onChange={e =>
                  setForm(f => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Origen</Label>
                <Select
                  value={form.source}
                  onValueChange={v =>
                    setForm(f => ({ ...f, source: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor estimado ($)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="50000"
                  value={form.value}
                  onChange={e =>
                    setForm(f => ({ ...f, value: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones iniciales..."
                value={form.notes}
                onChange={e =>
                  setForm(f => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.name.trim()}
              >
                {isSubmitting ? 'Creando...' : 'Crear Lead'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
