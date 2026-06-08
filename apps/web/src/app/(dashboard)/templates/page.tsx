'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTemplates } from '@/src/hooks/use-templates';

export default function TemplatesPage() {
  const { templates, loading, fetchTemplates, deleteTemplate } = useTemplates();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = templates.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Plantillas</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} plantilla{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <a href="/templates/new">Nueva plantilla</a>
        </Button>
      </section>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar plantillas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No hay plantillas todavía.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href="/templates/new">Crear primera plantilla</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.body}
                </p>
                {template.variables && template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v) => (
                      <span
                        key={v}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
                      >
                        {'{{'}
                        {v}
                        {'}}'}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={`/templates/new?edit=${template.id}`}>Editar</a>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
