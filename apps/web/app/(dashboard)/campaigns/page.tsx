'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCampaigns } from '@/src/hooks/use-campaigns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando',
  completed: 'Completada',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export default function CampaignsPage() {
  const { campaigns, total, loading, fetchCampaigns, cancelCampaign } = useCampaigns();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">
            {total} campaña{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <a href="/campaigns/new">Nueva campaña</a>
        </Button>
      </section>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar campañas..."
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
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No hay campañas todavía.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href="/campaigns/new">Crear primera campaña</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns
            .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
            .map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold">
                      <a href={`/campaigns/${campaign.id}`} className="hover:underline">
                        {campaign.name}
                      </a>
                    </CardTitle>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[campaign.status] ?? ''}`}>
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-lg">{campaign.total_count}</p>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-600">{campaign.delivered_count}</p>
                      <p className="text-muted-foreground">Entregados</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">{campaign.failed_count}</p>
                      <p className="text-muted-foreground">Fallidos</p>
                    </div>
                  </div>
                  {campaign.status === 'draft' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1" asChild>
                        <a href={`/campaigns/${campaign.id}`}>Iniciar</a>
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => cancelCampaign(campaign.id)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
