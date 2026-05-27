'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAutomations, type Condition, type Action } from '@/src/hooks/use-automations';

const FIELD_OPTIONS = [
  { value: 'message.content', label: 'Contenido del mensaje' },
  { value: 'message.sender_jid', label: 'Remitente' },
  { value: 'message.type', label: 'Tipo de mensaje' },
] as const;

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'contiene' },
  { value: 'equals', label: 'es igual a' },
  { value: 'starts_with', label: 'empieza con' },
  { value: 'regex', label: 'coincide con (regex)' },
] as const;

const ACTION_TYPE_OPTIONS = [
  { value: 'reply.text', label: 'Responder con texto' },
  { value: 'reply.image', label: 'Responder con imagen' },
  { value: 'webhook', label: 'Disparar webhook' },
  { value: 'ai_hook', label: 'Enviar a IA externa' },
] as const;

function emptyCondition(): Condition {
  return { field: 'message.content', operator: 'contains', value: '' };
}

function emptyAction(): Action {
  return { type: 'reply.text', config: { text: '' } };
}

export default function NewAutomationPage() {
  const router = useRouter();
  const { createRule } = useAutomations();
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([emptyCondition()]);
  const [actions, setActions] = useState<Action[]>([emptyAction()]);
  const [submitting, setSubmitting] = useState(false);

  const updateCondition = (i: number, field: keyof Condition, value: string) => {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const removeCondition = (i: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, emptyCondition()]);
  };

  const updateAction = (i: number, field: keyof Action | 'config.key' | 'config.value', key?: string, value?: string) => {
    setActions((prev) =>
      prev.map((a, idx) => {
        if (idx !== i) return a;
        if (field === 'type') return { ...a, type: value as Action['type'] };
        if (field === 'config.key') return { ...a, config: { ...a.config, [key!]: a.config[key!] ?? '' } };
        if (field === 'config.value') return { ...a, config: { ...a.config, [key!]: value! } };
        return a;
      }),
    );
  };

  const updateActionConfig = (i: number, key: string, value: string) => {
    setActions((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, config: { ...a.config, [key]: value } } : a)),
    );
  };

  const removeAction = (i: number) => {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addAction = () => {
    setActions((prev) => [...prev, emptyAction()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await createRule({
        name: name.trim(),
        conditions: conditions.filter((c) => c.value.trim()),
        actions: actions.filter((a) => {
          if (a.type === 'reply.text') return a.config.text?.trim();
          if (a.type === 'reply.image') return a.config.url?.trim();
          if (a.type === 'webhook') return a.config.url?.trim();
          if (a.type === 'ai_hook') return a.config.endpoint?.trim();
          return true;
        }),
      });
      router.push('/automations');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const actionConfigFields = (action: Action): { key: string; label: string; placeholder: string }[] => {
    switch (action.type) {
      case 'reply.text':
        return [{ key: 'text', label: 'Texto de respuesta', placeholder: 'Hola, gracias por tu mensaje...' }];
      case 'reply.image':
        return [
          { key: 'url', label: 'URL de la imagen', placeholder: 'https://ejemplo.com/imagen.jpg' },
          { key: 'caption', label: 'Pie de foto (opcional)', placeholder: 'Opcional' },
        ];
      case 'webhook':
        return [{ key: 'url', label: 'URL del webhook', placeholder: 'https://ejemplo.com/webhook' }];
      case 'ai_hook':
        return [{ key: 'endpoint', label: 'Endpoint IA', placeholder: 'https://ejemplo.com/ai-webhook' }];
      default:
        return [];
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva regla</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Si un mensaje entrante cumple TODAS las condiciones, se ejecutan TODAS las acciones.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nombre</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: "Responder precio automáticamente"'
              required
            />
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Condiciones</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addCondition}>
                + Agregar condición
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las condiciones deben cumplirse para activar la regla.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-3">
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Campo</Label>
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, 'field', e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {FIELD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Operador</Label>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {OPERATOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      value={cond.value}
                      onChange={(e) => updateCondition(i, 'value', e.target.value)}
                      placeholder='Ej: "precio", "hola", "^venta$"'
                    />
                  </div>
                </div>
                {conditions.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" className="mt-5" onClick={() => removeCondition(i)}>
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Acciones</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addAction}>
                + Agregar acción
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las acciones se ejecutan en orden cuando la regla se activa.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {actions.map((action, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-md border p-3">
                <div className="flex items-start justify-between">
                  <select
                    value={action.type}
                    onChange={(e) => {
                      const newType = e.target.value as Action['type'];
                      setActions((prev) =>
                        prev.map((a, idx) => (idx === i ? { type: newType, config: {} } : a)),
                      );
                    }}
                    className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {ACTION_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {actions.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeAction(i)}>
                      ✕
                    </Button>
                  )}
                </div>

                {/* Dynamic config fields */}
                <div className="flex flex-col gap-2">
                  {actionConfigFields(action).map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        value={action.config[field.key] ?? ''}
                        onChange={(e) => updateActionConfig(i, field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Creando...' : 'Crear regla'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/automations">Cancelar</a>
          </Button>
        </div>
      </form>
    </div>
  );
}
