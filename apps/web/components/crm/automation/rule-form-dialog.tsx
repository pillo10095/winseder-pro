'use client';

import { useState, useEffect } from 'react';
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
import { Plus, X } from 'lucide-react';
import { useLabels } from '@/src/hooks/use-labels';
import type { AutomationRule } from '@/lib/rule-engine';

interface RuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Omit<AutomationRule, 'id' | 'created_at'>) => void;
  editRule?: AutomationRule | null;
}

const TRIGGER_OPTIONS = [
  { value: 'lead_created', label: 'Lead Creado' },
  { value: 'lead_moved', label: 'Lead Movido' },
  { value: 'lead_inactive', label: 'Lead Inactivo' },
  { value: 'days_since', label: 'Días desde última actividad' },
];

const ACTION_OPTIONS = [
  { value: 'enviar_mensaje', label: 'Enviar Mensaje' },
  { value: 'cambiar_etapa', label: 'Cambiar Etapa' },
  { value: 'asignar_etiqueta', label: 'Asignar Etiqueta' },
  { value: 'crear_recordatorio', label: 'Crear Recordatorio' },
  { value: 'notificar', label: 'Notificar' },
];

const PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

export function RuleFormDialog({
  open,
  onClose,
  onSave,
  editRule,
}: RuleFormDialogProps) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    prioridad: 'media' as string,
    trigger_tipo: 'lead_created',
    trigger_dias: '7',
    action_tipo: 'enviar_mensaje',
    action_config: '{}',
  });

  const [condiciones, setCondiciones] = useState<Array<{ campo: string; operador: string; valor: string }>>([]);
  const { labels: allLabels, fetchLabels } = useLabels();

  useEffect(() => {
    if (editRule) {
      setForm({
        nombre: editRule.nombre || '',
        descripcion: editRule.descripcion || '',
        prioridad: editRule.prioridad || 'media',
        trigger_tipo: editRule.trigger?.type || 'lead_created',
        trigger_dias: String(editRule.trigger?.config?.days ?? '7'),
        action_tipo: editRule.action?.tipo || 'enviar_mensaje',
        action_config: JSON.stringify(
          editRule.action?.config ?? {},
          null,
          2
        ),
      });
      setCondiciones(
        editRule.condiciones?.map(c => ({
          campo: c.campo,
          operador: c.operador,
          valor: c.valor,
        })) ?? [],
      );
    } else {
      setForm({
        nombre: '',
        descripcion: '',
        prioridad: 'media',
        trigger_tipo: 'lead_created',
        trigger_dias: '7',
        action_tipo: 'enviar_mensaje',
        action_config: '{}',
      });
      setCondiciones([]);
    }
  }, [editRule, open]);

  useEffect(() => {
    if (open) fetchLabels('current');
  }, [open, fetchLabels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      activa: editRule?.activa ?? true,
      color: editRule?.color || '#CC7722',
      prioridad: form.prioridad as 'alta' | 'media' | 'baja',
      trigger: {
        type: form.trigger_tipo,
        config:
          form.trigger_tipo === 'days_since'
            ? { days: Number(form.trigger_dias) }
            : undefined,
      },
      action: {
        tipo: form.action_tipo,
        config: JSON.parse(form.action_config || '{}'),
      },
      condiciones: condiciones.length > 0 ? condiciones : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editRule ? 'Editar Regla' : 'Nueva Regla de Automatización'}
          </DialogTitle>
          <DialogDescription>
            Configurá cuándo y cómo se ejecuta esta automatización.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la regla *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Seguimiento lead frío"
              value={form.nombre}
              onChange={e =>
                setForm(f => ({ ...f, nombre: e.target.value }))
              }
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Qué hace esta regla..."
              value={form.descripcion}
              onChange={e =>
                setForm(f => ({ ...f, descripcion: e.target.value }))
              }
              rows={2}
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <div className="flex gap-2">
              {PRIORIDAD_OPTIONS.map(p => (
                <Button
                  key={p.value}
                  type="button"
                  variant={
                    form.prioridad === p.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    setForm(f => ({ ...f, prioridad: p.value }))
                  }
                  className="flex-1"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="divider-constructivist" />

          {/* Disparador */}
          <div className="space-y-2">
            <Label>Disparador (Trigger)</Label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map(t => (
                <Button
                  key={t.value}
                  type="button"
                  variant={
                    form.trigger_tipo === t.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    setForm(f => ({ ...f, trigger_tipo: t.value }))
                  }
                >
                  {t.label}
                </Button>
              ))}
            </div>
            {form.trigger_tipo === 'days_since' && (
              <div className="mt-2 w-32">
                <Input
                  type="number"
                  min={1}
                  placeholder="Días"
                  value={form.trigger_dias}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      trigger_dias: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>

          {/* Condiciones */}
          <Separator className="divider-constructivist" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Condiciones (opcional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCondiciones(prev => [
                    ...prev,
                    { campo: 'etiqueta', operador: 'tiene', valor: '' },
                  ])
                }
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>

            {condiciones.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin condiciones — la regla se aplica a todos los leads que
                cumplan el disparador.
              </p>
            ) : (
              <div className="space-y-2">
                {condiciones.map((cond, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-sm border border-border p-2"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {/* Campo */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">
                          Campo
                        </label>
                        <select
                          value={cond.campo}
                          onChange={e => {
                            const next = [...condiciones];
                            next[i] = {
                              ...next[i],
                              campo: e.target.value,
                              valor: '',
                            };
                            setCondiciones(next);
                          }}
                          className="mt-0.5 w-full rounded-sm border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="etiqueta">Etiqueta</option>
                        </select>
                      </div>

                      {/* Operador */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">
                          Operador
                        </label>
                        <select
                          value={cond.operador}
                          onChange={e => {
                            const next = [...condiciones];
                            next[i] = { ...next[i], operador: e.target.value };
                            setCondiciones(next);
                          }}
                          className="mt-0.5 w-full rounded-sm border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="tiene">Tiene</option>
                          <option value="no_tiene">No tiene</option>
                        </select>
                      </div>

                      {/* Valor */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">
                          Valor
                        </label>
                        {cond.campo === 'etiqueta' ? (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {cond.valor ? (
                              (() => {
                                const lbl = allLabels.find(
                                  l => l.id === cond.valor,
                                );
                                return lbl ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
                                    style={{
                                      backgroundColor: lbl.color + '20',
                                      color: lbl.color,
                                    }}
                                  >
                                    {lbl.name}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...condiciones];
                                        next[i] = {
                                          ...next[i],
                                          valor: '',
                                        };
                                        setCondiciones(next);
                                      }}
                                      className="hover:opacity-70"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">
                                    Etiqueta no encontrada
                                  </span>
                                );
                              })()
                            ) : (
                              allLabels.map(label => (
                                <button
                                  key={label.id}
                                  type="button"
                                  onClick={() => {
                                    const next = [...condiciones];
                                    next[i] = {
                                      ...next[i],
                                      valor: label.id,
                                    };
                                    setCondiciones(next);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium border border-transparent hover:border-border transition-colors"
                                  style={{
                                    backgroundColor: label.color + '20',
                                    color: label.color,
                                  }}
                                >
                                  {label.name}
                                </button>
                              ))
                            )}
                            {allLabels.length === 0 && !cond.valor && (
                              <span className="text-[10px] text-muted-foreground">
                                Cargando...
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            value={cond.valor}
                            onChange={e => {
                              const next = [...condiciones];
                              next[i] = {
                                ...next[i],
                                valor: e.target.value,
                              };
                              setCondiciones(next);
                            }}
                            className="mt-0.5 w-full rounded-sm border border-input bg-background px-2 py-1 text-xs"
                            placeholder="Valor"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCondiciones(prev =>
                          prev.filter((_, j) => j !== i),
                        )
                      }
                      className="mt-4 rounded-sm p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="divider-constructivist" />

          {/* Acción */}
          <div className="space-y-2">
            <Label>Acción</Label>
            <div className="flex flex-wrap gap-2">
              {ACTION_OPTIONS.map(a => (
                <Button
                  key={a.value}
                  type="button"
                  variant={
                    form.action_tipo === a.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    setForm(f => ({ ...f, action_tipo: a.value }))
                  }
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Config JSON */}
          <div className="space-y-2">
            <Label htmlFor="action_config">
              Configuración de la acción (JSON)
            </Label>
            <Textarea
              id="action_config"
              placeholder='{"template_id": "..."}'
              value={form.action_config}
              onChange={e =>
                setForm(f => ({ ...f, action_config: e.target.value }))
              }
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!form.nombre.trim()}>
              {editRule ? 'Guardar Cambios' : 'Crear Regla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
