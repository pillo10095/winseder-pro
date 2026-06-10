"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SessionHealthDetail } from "@/src/hooks/use-session-health";

const statusColor = (status: string) => {
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

const pauseColor = (paused: boolean) =>
  paused
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/80"
    : "bg-secondary text-secondary-foreground hover:bg-secondary/80";

interface SessionDetailProps {
  session: SessionHealthDetail;
  sessionId: string;
  onPauseToggle: (id: string, isPaused: boolean) => void;
  onClose: () => void;
}

export function SessionDetail({
  session,
  sessionId,
  onPauseToggle,
  onClose,
}: SessionDetailProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Sesión: {sessionId.substring(0, 8)}...
            <Badge className={statusColor(session.health.status)}>
              {session.health.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            {session.health.isConnected ? "Conectada" : "Desconectada"}
            {" · "}
            Circuito: {session.health.circuitState}
            {" · "}
            {session.health.successRate}% éxito
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={session.pause.paused ? "default" : "outline"}
            className={pauseColor(session.pause.paused)}
            onClick={() =>
              onPauseToggle(sessionId, session.pause.paused)
            }
          >
            {session.pause.paused ? "Reanudar" : "Pausar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Health */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Salud
            </h3>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enviados</span>
                <span className="font-medium">
                  {session.health.totalSent}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fallos</span>
                <span className="font-medium">
                  {session.health.totalFailed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fallos consec.</span>
                <span className="font-medium">
                  {session.health.consecutiveFailures}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latencia media</span>
                <span className="font-medium">
                  {session.health.avgLatency
                    ? `${session.health.avgLatency}ms`
                    : "--"}
                </span>
              </div>
              {session.health.lastError && (
                <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                  {session.health.lastError}
                </div>
              )}
            </div>
          </div>

          {/* Delay */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Delay Adaptativo
            </h3>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delay actual</span>
                <span className="font-medium">
                  {session.delay.currentDelay}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min / Max</span>
                <span className="font-medium">
                  {session.delay.minDelay}ms / {session.delay.maxDelay}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fallos totales</span>
                <span className="font-medium">
                  {session.delay.totalFailures}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Éxitos totales</span>
                <span className="font-medium">
                  {session.delay.totalSuccesses}
                </span>
              </div>
              {session.delay.alertTriggered && (
                <div className="mt-2 rounded bg-destructive/10 p-2 text-xs font-medium text-destructive">
                  ¡Alerta! Demasiados fallos consecutivos
                </div>
              )}
            </div>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Presupuesto Diario
            </h3>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Límite</span>
                <span className="font-medium">{session.budget.limit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumido</span>
                <span className="font-medium">{session.budget.consumed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Restante</span>
                <span className="font-medium">{session.budget.remaining}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    session.budget.usagePercent > 80
                      ? "bg-destructive"
                      : session.budget.usagePercent > 50
                        ? "bg-warning"
                        : "bg-success"
                  }`}
                  style={{ width: `${session.budget.usagePercent}%` }}
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
                  {session.rateLimiter.tighteningLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Violaciones</span>
                <span className="font-medium">
                  {session.rateLimiter.violations}
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
                variant={session.quietHours.isActive ? "default" : "outline"}
              >
                {session.quietHours.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
