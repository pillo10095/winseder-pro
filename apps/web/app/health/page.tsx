"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      setChecking(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/health`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setHealth(body.data ?? body);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Health check failed");
      } finally {
        setChecking(false);
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center bg-primary text-2xl font-bold text-primary-foreground">
            W
          </div>
          <h1 className="text-xl font-bold tracking-tight">Wisender Pro</h1>
          <p className="text-sm text-muted-foreground">Health Check</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${
                  checking
                    ? "bg-yellow-400 animate-pulse"
                    : error
                      ? "bg-destructive"
                      : "bg-success"
                }`}
              />
              <CardTitle className="text-base">
                {checking
                  ? "Verificando…"
                  : error
                    ? "Servicio no disponible"
                    : "Operacional"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {health && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium">{health.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="font-medium">{health.service}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Último check</span>
                  <span className="font-medium">
                    {new Date(health.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </>
            )}

            {error && (
              <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 self-center text-xs text-muted-foreground underline hover:text-primary"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Wisender Pro v0.1
        </p>
      </div>
    </div>
  );
}
