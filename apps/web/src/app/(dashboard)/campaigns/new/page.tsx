'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCampaigns } from '@/src/hooks/use-campaigns';
import { useTemplates } from '@/src/hooks/use-templates';

export default function NewCampaignPage() {
  const router = useRouter();
  const { createCampaign } = useCampaigns();
  const { templates, fetchTemplates } = useTemplates();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        template_id: templateId || undefined,
        scheduled_at: scheduledAt || undefined,
      });
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva campaña</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá los detalles de tu campaña de mensajes.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información básica</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre de la campaña</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Campaña Bienvenida Enero"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="template">Plantilla (opcional)</Label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin plantilla</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="scheduledAt">Programar para (opcional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Creando...' : 'Crear campaña'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/campaigns">Cancelar</a>
          </Button>
        </div>
      </form>
    </div>
  );
}
