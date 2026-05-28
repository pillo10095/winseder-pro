'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { API_URL, fetchWithAuth } from '@/src/lib/api';

type AiLogEntry = {
  id: string;
  type: string;
  prompt: string;
  response: string;
  tokens_used: number;
  duration_ms: number;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  chat: 'Chat',
  classify: 'Clasificación',
  suggest: 'Sugerencia',
  summarize: 'Resumen',
  hot_lead: 'Lead caliente',
  rag: 'RAG',
  automation_classify: 'Clasificación (auto)',
  automation_hot_lead: 'Lead caliente (auto)',
};

const TYPE_COLORS: Record<string, string> = {
  chat: 'bg-blue-100 text-blue-700',
  classify: 'bg-purple-100 text-purple-700',
  suggest: 'bg-green-100 text-green-700',
  summarize: 'bg-yellow-100 text-yellow-700',
  hot_lead: 'bg-red-100 text-red-700',
  rag: 'bg-indigo-100 text-indigo-700',
  automation_classify: 'bg-purple-50 text-purple-600',
  automation_hot_lead: 'bg-red-50 text-red-600',
};

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/logs?limit=100`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs de IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial de inferencias del agente inteligente.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Inferencias recientes</CardTitle>
          <CardDescription>
            {logs.length === 0
              ? 'Todavía no hay actividad del agente IA.'
              : `Últimas ${logs.length} ejecuciones`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activá el agente en configuración para empezar a ver actividad.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-sm border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={
                        'inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ' +
                        (TYPE_COLORS[log.type] ?? 'bg-gray-100 text-gray-700')
                      }
                    >
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {log.duration_ms}ms · {log.tokens_used} tokens
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground">
                        Prompt
                      </span>
                      <p className="line-clamp-3 font-mono text-xs leading-relaxed text-foreground/80">
                        {log.prompt ?? '—'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground">
                        Respuesta
                      </span>
                      <p className="line-clamp-3 font-mono text-xs leading-relaxed text-foreground/80">
                        {log.response ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
