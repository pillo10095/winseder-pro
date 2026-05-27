'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCampaigns } from '@/src/hooks/use-campaigns';
import { API_URL, fetchWithAuth } from '@/src/lib/api';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando',
  completed: 'Completada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  if (!id) return null;

  return <CampaignDetail id={id} />;
}

function CampaignDetail({ id }: { id: string }) {
  const { current, loading, fetchCampaignById, startCampaign, pauseCampaign, cancelCampaign } = useCampaigns();
  const [campaignContacts, setCampaignContacts] = useState<Array<{
    id: string;
    status: string;
    contact: { id: string; name: string; phone?: string };
  }>>([]);

  useEffect(() => {
    fetchCampaignById(id);
    fetchContacts();
  }, [id, fetchCampaignById]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/campaigns/${id}/contacts`);
      if (res.ok) {
        const data = await res.json();
        setCampaignContacts(data.data ?? []);
      }
    } catch {
      // ignore
    }
  }, [id]);

  if (loading || !current) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const campaign = current;

  const handleStart = async () => {
    await startCampaign(campaign.id);
    fetchCampaignById(id);
  };

  const handlePause = async () => {
    await pauseCampaign(campaign.id);
    fetchCampaignById(id);
  };

  const handleCancel = async () => {
    await cancelCampaign(campaign.id);
    fetchCampaignById(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estado: {STATUS_LABELS[campaign.status] ?? campaign.status}
            {campaign.template && ` · Plantilla: ${campaign.template.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button onClick={handleStart}>Iniciar campaña</Button>
          )}
          {campaign.status === 'sending' && (
            <Button variant="outline" onClick={handlePause}>Pausar</Button>
          )}
          {campaign.status === 'paused' && (
            <Button onClick={handleStart}>Reanudar</Button>
          )}
          {(campaign.status === 'draft' || campaign.status === 'paused') && (
            <Button variant="destructive" onClick={handleCancel}>Cancelar</Button>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{campaign.total_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{campaign.sent_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{campaign.delivered_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fallidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{campaign.failed_count}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contactos ({campaignContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay contactos en esta campaña. Importá un CSV desde la campaña.
            </p>
          ) : (
            <div className="divide-y">
              {campaignContacts.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{cc.contact.name}</p>
                    {cc.contact.phone && (
                      <p className="text-xs text-muted-foreground">{cc.contact.phone}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{cc.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
