'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { API_URL, fetchWithAuth } from '@/src/lib/api';

type TrainingDoc = {
  id: string;
  title: string;
  content: string;
  content_type: string;
  created_at: string;
};

export default function AiTrainingPage() {
  const [docs, setDocs] = useState<TrainingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/training`);
      if (res.ok) {
        const json = await res.json();
        setDocs(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        await fetchDocs();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDoc(id: string) {
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/training/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDocs();
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Documentos de entrenamiento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agregá FAQs, documentación o contenido de referencia para que el agente IA pueda responder consultas con contexto.
        </p>
      </div>

      <Separator />

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar documento</CardTitle>
          <CardDescription>
            Escribí o pegá el contenido que querés que el agente conozca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDoc} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Política de devoluciones"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content">Contenido</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribí el contenido del documento..."
                rows={8}
              />
            </div>
            <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
              {saving ? 'Guardando...' : 'Agregar documento'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document list */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos guardados</CardTitle>
          <CardDescription>
            {docs.length === 0
              ? 'Todavía no hay documentos de entrenamiento.'
              : `${docs.length} documento(s) cargado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Agregá documentos arriba para empezar.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between rounded-sm border border-border p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {doc.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteDoc(doc.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
