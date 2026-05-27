'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAutomations } from '@/src/hooks/use-automations';

const CONDITION_LABELS: Record<string, string> = {
  'message.content': 'Contenido del mensaje',
  'message.sender_jid': 'Remitente',
  'message.type': 'Tipo de mensaje',
};

const OPERATOR_LABELS: Record<string, string> = {
  contains: 'contiene',
  equals: 'es igual a',
  starts_with: 'empieza con',
  regex: 'coincide con (regex)',
};

const ACTION_LABELS: Record<string, string> = {
  'reply.text': 'Responder con texto',
  'reply.image': 'Responder con imagen',
  webhook: 'Disparar webhook',
  ai_hook: 'Enviar a IA externa',
};

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  if (!id) return null;

  return <AutomationDetail id={id} />;
}

function AutomationDetail({ id }: { id: string }) {
  const { current, loading, fetchRuleById, toggleRule, deleteRule } = useAutomations();

  useEffect(() => {
    fetchRuleById(id);
  }, [id, fetchRuleById]);

  if (loading || !current) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const rule = current;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{rule.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                rule.is_active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {rule.is_active ? 'Activa' : 'Inactiva'}
            </span>
            <span className="text-xs text-muted-foreground">
              Prioridad: {rule.priority} · Creada: {new Date(rule.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={rule.is_active ? 'outline' : 'default'}
            onClick={async () => {
              await toggleRule(rule.id);
              fetchRuleById(id);
            }}
          >
            {rule.is_active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteRule(rule.id);
              window.location.href = '/automations';
            }}
          >
            Eliminar
          </Button>
        </div>
      </section>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condiciones</CardTitle>
          <p className="text-xs text-muted-foreground">
            La regla se activa cuando TODAS estas condiciones se cumplen.
          </p>
        </CardHeader>
        <CardContent>
          {rule.conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Sin condiciones (se activa con cualquier mensaje)</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rule.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                    {CONDITION_LABELS[cond.field] ?? cond.field}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {OPERATOR_LABELS[cond.operator] ?? cond.operator}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-mono text-primary">
                    &quot;{cond.value}&quot;
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones</CardTitle>
          <p className="text-xs text-muted-foreground">
            Se ejecutan en orden cuando la regla se activa.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {rule.actions.map((action, i) => (
              <div key={i} className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {ACTION_LABELS[action.type] ?? action.type}
                  </span>
                </div>
                <div className="mt-2 ml-8 flex flex-col gap-1">
                  {Object.entries(action.config).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Execution Log placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de ejecuciones</CardTitle>
          <p className="text-xs text-muted-foreground">
            Últimas veces que esta regla se activó.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex size-12 items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <span className="text-xs font-bold text-muted-foreground/50">{'//'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay ejecuciones registradas todavía.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Las ejecuciones aparecerán aquí automáticamente cuando la regla se active.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
