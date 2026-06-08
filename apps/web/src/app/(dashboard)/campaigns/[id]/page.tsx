'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCampaigns } from '@/src/hooks/use-campaigns';
import { usePipeline } from '@/src/hooks/use-pipeline';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { current, loading, fetchCampaignById, startCampaign, pauseCampaign, cancelCampaign, setTriggerEvent } = useCampaigns();
  const { stages, fetchStages } = usePipeline();
  const [triggerEnabled, setTriggerEnabled] = useState(false);
  const [triggerStage, setTriggerStage] = useState('');

  useEffect(() => {
    fetchCampaignById(id);
    fetchStages();
  }, [id, fetchCampaignById, fetchStages]);

  useEffect(() => {
    if (current && (current as any).trigger_event) {
      const evt = (current as any).trigger_event;
      setTriggerEnabled(true);
      setTriggerStage(evt?.stage_id || '');
    }
  }, [current]);

  const handleSaveTrigger = async () => {
    await setTriggerEvent(id, triggerEnabled ? { type: 'deal.stage_changed', stage_id: triggerStage } : null);
  };

  if (loading || !current) {
    return (
      <div className="rounded-sm border border-border p-12 text-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{current.name}</h1>
          <p className="text-sm text-muted-foreground">Detalle de campaña</p>
        </div>
        <div className="flex gap-2">
          {current.status === 'draft' && (
            <button
              onClick={() => startCampaign(current.id)}
              className="rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
            >
              Iniciar
            </button>
          )}
          {current.status === 'sending' && (
            <button
              onClick={() => pauseCampaign(current.id)}
              className="rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted-light"
            >
              Pausar
            </button>
          )}
          {(current.status === 'draft' || current.status === 'paused') && (
            <button
              onClick={() => cancelCampaign(current.id)}
              className="rounded-sm bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      <div className="rounded-sm border border-border">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Estadísticas</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{current.total_count}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{current.delivered_count}</p>
              <p className="text-xs text-muted-foreground">Entregados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{current.failed_count}</p>
              <p className="text-xs text-muted-foreground">Fallidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{current.read_count}</p>
              <p className="text-xs text-muted-foreground">Leídos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Disparo automático</h3>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Esta campaña puede dispararse automáticamente cuando un deal llega a una etapa específica del pipeline.
          </p>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={triggerEnabled}
              onChange={(e) => setTriggerEnabled(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Disparar automáticamente</span>
          </label>

          {triggerEnabled && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cuando un deal llegue a la etapa</label>
              <select
                value={triggerStage}
                onChange={(e) => setTriggerStage(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar etapa...</option>
                {stages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSaveTrigger}
            disabled={triggerEnabled && !triggerStage}
            className="self-start rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}
