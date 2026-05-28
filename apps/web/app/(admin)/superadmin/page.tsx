"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_URL, fetchWithAuth } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth-store";

interface SystemStats {
  companies: { total: number; active: number };
  users: { total: number; admins: number; agents: number; superadmins: number };
  sessions: { total: number; connected: number };
  messages: { total: number };
  plans: { total: number };
  subscriptions: { active: number; trial: number };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth(`${API_URL}/admin/stats`);
        if (res.ok) {
          const json = await res.json();
          setStats(json.data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!user || user.role !== "superadmin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Acceso denegado
        </CardContent>
      </Card>
    );
  }

  const metricCards = [
    {
      label: "Empresas",
      value: stats?.companies.total ?? "--",
      sub: `${stats?.companies.active ?? 0} activas`,
    },
    {
      label: "Usuarios",
      value: stats?.users.total ?? "--",
      sub: `${stats?.users.admins ?? 0} admins · ${stats?.users.agents ?? 0} agentes`,
    },
    {
      label: "Sesiones WhatsApp",
      value: stats?.sessions.total ?? "--",
      sub: `${stats?.sessions.connected ?? 0} conectadas`,
    },
    {
      label: "Mensajes",
      value: stats?.messages.total?.toLocaleString() ?? "--",
      sub: "totales",
    },
    {
      label: "Planes",
      value: stats?.plans.total ?? "--",
      sub: "activos",
    },
    {
      label: "Suscripciones",
      value: (stats?.subscriptions.active ?? 0) + (stats?.subscriptions.trial ?? 0),
      sub: `${stats?.subscriptions.active ?? 0} activas · ${stats?.subscriptions.trial ?? 0} trial`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panel SuperAdmin
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen global del sistema
        </p>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((m) => (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-3xl font-bold tracking-tight">
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
