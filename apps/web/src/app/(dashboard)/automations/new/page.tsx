"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutomations, type Condition, type Action } from "@/src/hooks/use-automations";
import { ConditionRow } from "@/src/components/automations/ConditionRow";
import { ActionCard } from "@/src/components/automations/ActionCard";
import { emptyCondition, emptyAction } from "@/src/components/automations/constants";

export default function NewAutomationPage() {
  const router = useRouter();
  const { createRule } = useAutomations();
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([emptyCondition()]);
  const [actions, setActions] = useState<Action[]>([emptyAction()]);
  const [submitting, setSubmitting] = useState(false);

  const updateCondition = useCallback((i: number, field: keyof Condition, value: string) => {
    setConditions((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    );
  }, []);

  const removeCondition = useCallback((i: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addCondition = useCallback(() => {
    setConditions((prev) => [...prev, emptyCondition()]);
  }, []);

  const updateActionConfig = useCallback((i: number, key: string, value: string) => {
    setActions((prev) =>
      prev.map((a, idx) =>
        idx === i ? { ...a, config: { ...a.config, [key]: value } } : a,
      ),
    );
  }, []);

  const changeActionType = useCallback((i: number, type: Action["type"]) => {
    setActions((prev) =>
      prev.map((a, idx) => (idx === i ? { type, config: {} } : a)),
    );
  }, []);

  const removeAction = useCallback((i: number) => {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const addAction = useCallback(() => {
    setActions((prev) => [...prev, emptyAction()]);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await createRule({
        name: name.trim(),
        conditions: conditions.filter((c) => c.value.trim()),
        actions: actions.filter((a) => {
          if (a.type === "reply.text") return a.config.text?.trim();
          if (a.type === "reply.image") return a.config.url?.trim();
          if (a.type === "webhook") return a.config.url?.trim();
          if (a.type === "ai_hook") return a.config.endpoint?.trim();
          return true;
        }),
      });
      router.push("/automations");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [name, createRule, router]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva regla</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Si un mensaje entrante cumple TODAS las condiciones, se ejecutan TODAS
          las acciones.
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCondition}
              >
                + Agregar condición
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las condiciones deben cumplirse para activar la regla.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {conditions.map((cond, i) => (
              <ConditionRow
                key={i}
                condition={cond}
                index={i}
                isRemovable={conditions.length > 1}
                onUpdate={updateCondition}
                onRemove={removeCondition}
              />
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Acciones</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addAction}
              >
                + Agregar acción
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las acciones se ejecutan en orden cuando la regla se activa.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {actions.map((action, i) => (
              <ActionCard
                key={i}
                action={action}
                index={i}
                isRemovable={actions.length > 1}
                onUpdateConfig={updateActionConfig}
                onChangeType={changeActionType}
                onRemove={removeAction}
              />
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Creando..." : "Crear regla"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/automations">Cancelar</a>
          </Button>
        </div>
      </form>
    </div>
  );
}
