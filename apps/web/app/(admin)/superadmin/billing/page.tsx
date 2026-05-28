"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_URL, fetchWithAuth } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth-store";

interface SubscriptionItem {
  id: string;
  company_name: string;
  plan_name: string;
  plan_price: number;
  status: string;
  trial_ends_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface SubscriptionsResponse {
  items: SubscriptionItem[];
  total: number;
}

export default function BillingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsResponse | null>(null);
  const [billingStatus, setBillingStatus] = useState<{ configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, statusRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/admin/billing/subscriptions?limit=20`),
          fetchWithAuth(`${API_URL}/admin/billing/status`),
        ]);

        if (subRes.ok) {
          const json = await subRes.json();
          setSubscriptions(json.data);
        }
        if (statusRes.ok) {
          const json = await statusRes.json();
          setBillingStatus(json.data);
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

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      trial: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
    };
    return colors[status] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Facturación
        </h1>
        <p className="text-sm text-muted-foreground">
          Suscripciones y estado de Conekta
        </p>
      </section>

      {/* Conekta Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            Conekta
            {billingStatus && (
              <Badge
                variant={billingStatus.configured ? "default" : "outline"}
              >
                {billingStatus.configured
                  ? "Configurado"
                  : "No configurado"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {billingStatus?.configured
              ? "Integración con Conekta activa."
              : "API key de Conekta no configurada. Las operaciones de facturación están en modo simulación."}
          </p>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Suscripciones activas
            {subscriptions && ` (${subscriptions.total})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Cargando…
            </div>
          ) : subscriptions && subscriptions.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="col-span-3">Empresa</span>
                <span className="col-span-3">Plan</span>
                <span className="col-span-2">Estado</span>
                <span className="col-span-2">Valor</span>
                <span className="col-span-2">Vence</span>
              </div>

              {subscriptions.items.map((sub) => (
                <div
                  key={sub.id}
                  className="grid grid-cols-12 gap-2 rounded-sm border px-4 py-3 text-sm items-center"
                >
                  <span className="col-span-3 font-medium">
                    {sub.company_name}
                  </span>
                  <span className="col-span-3 text-muted-foreground">
                    {sub.plan_name}
                  </span>
                  <span className="col-span-2">
                    <Badge className={statusBadge(sub.status)}>
                      {sub.status}
                    </Badge>
                  </span>
                  <span className="col-span-2">
                    ${Number(sub.plan_price).toLocaleString()} MXN
                  </span>
                  <span className="col-span-2 text-xs text-muted-foreground">
                    {sub.ends_at
                      ? new Date(sub.ends_at).toLocaleDateString()
                      : sub.trial_ends_at
                        ? `Trial: ${new Date(sub.trial_ends_at).toLocaleDateString()}`
                        : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No hay suscripciones
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
