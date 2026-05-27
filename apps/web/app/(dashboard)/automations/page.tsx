'use client';

import { useEffect } from 'react';
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
  'reply.text': 'Responder texto',
  'reply.image': 'Responder imagen',
  webhook: 'Webhook',
  ai_hook: 'IA externa',
};

export default function AutomationsPage() {
  const { rules, loading, fetchRules, toggleRule, deleteRule } = useAutomations();

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground">
            {rules.length} regla{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <a href="/automations/new">Nueva regla</a>
        </Button>
      </section>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No hay reglas de automatización todavía.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Creá reglas para responder automáticamente a mensajes entrantes.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <a href="/automations/new">Crear primera regla</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold">
                      <a href={`/automations/${rule.id}`} className="hover:underline">
                        {rule.name}
                      </a>
                    </CardTitle>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {rule.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={rule.is_active ? 'outline' : 'default'}
                      onClick={() => toggleRule(rule.id)}
                    >
                      {rule.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteRule(rule.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {/* Conditions */}
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condiciones</p>
                  {rule.conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {CONDITION_LABELS[cond.field] ?? cond.field}
                      </span>
                      <span className="text-muted-foreground">{OPERATOR_LABELS[cond.operator] ?? cond.operator}</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                        &quot;{cond.value}&quot;
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</p>
                  {rule.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {ACTION_LABELS[action.type] ?? action.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Object.entries(action.config).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
