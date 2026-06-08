"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  useSessionHealth,
  type SessionHealthDetail,
} from "@/src/hooks/use-session-health";

type SortKey = "status" | "name";
type SortDir = "asc" | "desc";

export default function AntiBanPage() {
  const {
    overview,
    sessionDetail,
    loading,
    error,
    fetchOverview,
    fetchSessionHealth,
    pauseSession,
    resumeSession,
    fetchBudget,
  } = useSessionHealth();

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [budgetData, setBudgetData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchOverview();
    // Poll every 30s
    const interval = setInterval(fetchOverview, 30_000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionHealth(selectedSession);
      fetchBudget(selectedSession).then(setBudgetData);
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-success text-success-foreground hover:bg-success/80";
      case "degraded":
        return "bg-warning text-warning-foreground hover:bg-warning/80";
      case "unhealthy":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/80";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPauseColor = (paused: boolean) =>
    paused
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/80"
      : "bg-secondary text-secondary-foreground hover:bg-secondary/80";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Anti-Ban Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitoreo de salud de sesiones y protección anti-ban
        </p>
      </section>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-3xl font-bold tracking-tight">
              {overview?.total ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Saludables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-3xl font-bold tracking-tight text-success">
              {overview?.healthy ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning">
              Degradadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-3xl font-bold tracking-tight text-warning">
              {overview?.degraded ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              No Saludables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-3xl font-bold tracking-tight text-destructive">
              {overview?.unhealthy ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card className={overview?.paused ? "border-destructive/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Pausa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-sans text-3xl font-bold tracking-tight ${
                overview?.paused ? "text-destructive" : ""
              }`}
            >
              {overview?.paused ?? "--"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensajes Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-2xl font-bold tracking-tight">
              {overview?.totalSent?.toLocaleString() ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fallos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-2xl font-bold tracking-tight text-destructive">
              {overview?.totalFailed?.toLocaleString() ?? "--"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Éxito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-2xl font-bold tracking-tight">
              {overview && overview.totalSent + overview.totalFailed > 0
                ? `${Math.round(
                    (overview.totalSent /
                      (overview.totalSent + overview.totalFailed)) *
                      100,
                  )}%`
                : "--"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Paused Sessions Detail */}
      {overview && overview.paused > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-destructive animate-pulse" />
              Sesiones en Pausa
            </CardTitle>
            <CardDescription>
              Sesiones pausadas automática o manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {overview.pausedSessions.map((ps) => (
                <div
                  key={ps.sessionId}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {ps.sessionId.substring(0, 8)}...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ps.reason}
                    </span>
                    {ps.autoResumeAt && (
                      <span className="text-xs text-muted-foreground/60">
                        Reanudación automática:{" "}
                        {new Date(ps.autoResumeAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePauseToggle(ps.sessionId, true)}
                  >
                    Reanudar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Detail */}
      {selectedSession && sessionDetail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Sesión: {selectedSession.substring(0, 8)}...
                <Badge className={getStatusColor(sessionDetail.health.status)}>
                  {sessionDetail.health.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {sessionDetail.health.isConnected ? "Conectada" : "Desconectada"}
                {" · "}
                Circuito: {sessionDetail.health.circuitState}
                {" · "}
                {sessionDetail.health.successRate}% éxito
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sessionDetail.pause.paused ? "default" : "outline"}
                className={getPauseColor(sessionDetail.pause.paused)}
                onClick={() =>
                  handlePauseToggle(selectedSession, sessionDetail.pause.paused)
                }
              >
                {sessionDetail.pause.paused ? "Reanudar" : "Pausar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSession(null)}
              >
                Cerrar
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Health Details */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Salud
                </h3>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enviados</span>
                    <span className="font-medium">
                      {sessionDetail.health.totalSent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fallos</span>
                    <span className="font-medium">
                      {sessionDetail.health.totalFailed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fallos consec.</span>
                    <span className="font-medium">
                      {sessionDetail.health.consecutiveFailures}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latencia media</span>
                    <span className="font-medium">
                      {sessionDetail.health.avgLatency
                        ? `${sessionDetail.health.avgLatency}ms`
                        : "--"}
                    </span>
                  </div>
                  {sessionDetail.health.lastError && (
                    <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {sessionDetail.health.lastError}
                    </div>
                  )}
                </div>
              </div>

              {/* Delay Details */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Delay Adaptativo
                </h3>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delay actual</span>
                    <span className="font-medium">
                      {sessionDetail.delay.currentDelay}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min / Max</span>
                    <span className="font-medium">
                      {sessionDetail.delay.minDelay}ms /{" "}
                      {sessionDetail.delay.maxDelay}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fallos totales</span>
                    <span className="font-medium">
                      {sessionDetail.delay.totalFailures}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Éxitos totales</span>
                    <span className="font-medium">
                      {sessionDetail.delay.totalSuccesses}
                    </span>
                  </div>
                  {sessionDetail.delay.alertTriggered && (
                    <div className="mt-2 rounded bg-destructive/10 p-2 text-xs font-medium text-destructive">
                      ¡Alerta! Demasiados fallos consecutivos
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Details */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Presupuesto Diario
                </h3>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Límite</span>
                    <span className="font-medium">
                      {sessionDetail.budget.limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consumido</span>
                    <span className="font-medium">
                      {sessionDetail.budget.consumed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Restante</span>
                    <span className="font-medium">
                      {sessionDetail.budget.remaining}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sessionDetail.budget.usagePercent > 80
                          ? "bg-destructive"
                          : sessionDetail.budget.usagePercent > 50
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{ width: `${sessionDetail.budget.usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Limiter & Quiet Hours */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rate Limiter
                </h3>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nivel tightening</span>
                    <span className="font-medium">
                      {sessionDetail.rateLimiter.tighteningLevel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Violaciones</span>
                    <span className="font-medium">
                      {sessionDetail.rateLimiter.violations}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Horario Silencioso
                </h3>
                <div className="flex gap-2">
                  <Badge
                    variant={sessionDetail.quietHours.isActive ? "default" : "outline"}
                  >
                    {sessionDetail.quietHours.isActive
                      ? "Activo"
                      : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No sessions state */}
      {overview && overview.total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 flex size-12 items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <span className="text-xs font-bold text-muted-foreground/50">
                {"//"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay sesiones WhatsApp registradas.
            </p>
            <p className="text-xs text-muted-foreground/60">
            Conectá una sesión para ver el dashboard anti-ban.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
