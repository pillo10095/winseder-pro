'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTemplates } from '@/src/hooks/use-templates';

export default function NewTemplatePage() {
  const router = useRouter();
  const { createTemplate } = useTemplates();
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const variables = extractVariables(body);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      await createTemplate({ name: name.trim(), body: body.trim() });
      router.push('/templates');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const insertVariable = useCallback((varName: string) => {
    setBody((prev) => prev + `{{${varName}}}`);
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva plantilla</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creá una plantilla de mensaje con variables dinámicas.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Plantilla Bienvenida"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="body">Mensaje</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {['nombre', 'email', 'telefono', 'empresa'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="rounded bg-muted px-2 py-1 text-xs font-mono hover:bg-muted/80 transition-colors"
                  >
                    {'{{'}
                    {v}
                    {'}}'}
                  </button>
                ))}
              </div>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hola {{nombre}}, gracias por contactarnos..."
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            {variables.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Variables detectadas:</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v) => (
                    <span
                      key={v}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-mono text-primary"
                    >
                      {'{{'}
                      {v}
                      {'}}'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap">
                {body || 'El mensaje se verá así...'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim() || !body.trim()}>
            {submitting ? 'Creando...' : 'Crear plantilla'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/templates">Cancelar</a>
          </Button>
        </div>
      </form>
    </div>
  );
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}
