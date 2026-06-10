"use client";

import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { useSessionHealth } from "@/src/hooks/use-session-health";
import { StatCard } from "@/src/components/anti-ban/StatCard";
import { PausedSessions } from "@/src/components/anti-ban/PausedSessions";
import { SessionDetail } from "@/src/components/anti-ban/SessionDetail";
import { EmptyState } from "@/src/components/anti-ban/EmptyState";

export default function AntiBanPage() {
  const {
    overview,
    sessionDetail,
    error,
    fetchOverview,
    fetchSessionHealth,
    pauseSession,
    resumeSession,
    fetchBudget,
  } = useSessionHealth();

  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30_000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionHealth(selectedSession);
      fetchBudget(selectedSession);
    }
  }, [selectedSession, fetchSessionHealth, fetchBudget]);

  const handlePauseToggle = async (sessionId: string, isPaused: boolean) => {
    if (isPaused) {
      await resumeSession(sessionId);
    } else {
      await pauseSession(sessionId);
    }
    fetchOverview();
    if (selectedSession === sessionId) {
      fetchSessionHealth(sessionId);
    }
  };

  const calcSuccessRate = () => {
    if (!overview) return "--";
    const { totalSent, totalFailed } = overview;
    if (totalSent + totalFailed === 0) return "--";
    return `${Math.round((totalSent / (totalSent + totalFailed)) * 100)}%`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Anti-Ban Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitoreo de salud de sesiones y protección anti-ban
        </p>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Sesiones" value={overview?.total ?? "--"} />
        <StatCard title="Saludables" value={overview?.healthy ?? "--"} variant="success" />
        <StatCard title="Degradadas" value={overview?.degraded ?? "--"} variant="warning" />
        <StatCard title="No Saludables" value={overview?.unhealthy ?? "--"} variant="danger" />
        <StatCard title="En Pausa" value={overview?.paused ?? "--"} variant={overview?.paused ? "paused" : "default"} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Mensajes Enviados" value={overview?.totalSent?.toLocaleString() ?? "--"} size="md" />
        <StatCard title="Fallos" value={overview?.totalFailed?.toLocaleString() ?? "--"} size="md" variant="danger" />
        <StatCard title="Tasa de Éxito" value={calcSuccessRate()} size="md" />
      </section>

      {overview && overview.paused > 0 && (
        <PausedSessions
          sessions={overview.pausedSessions}
          onResume={(id) => handlePauseToggle(id, true)}
        />
      )}

      {selectedSession && sessionDetail && (
        <SessionDetail
          session={sessionDetail}
          sessionId={selectedSession}
          onPauseToggle={handlePauseToggle}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {overview && overview.total === 0 && <EmptyState />}
    </div>
  );
}
