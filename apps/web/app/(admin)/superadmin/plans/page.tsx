"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL, fetchWithAuth } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth-store";

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_mxn: number;
  max_contacts: number;
  max_whatsapp_sessions: number;
  max_campaigns_per_month: number;
  features: string[];
  is_active: boolean;
}

export default function PlansPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    price_mxn: 0,
    max_contacts: 100,
    max_whatsapp_sessions: 1,
    max_campaigns_per_month: 0,
  });

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/");
    }
  }, [user, router]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/admin/billing/plans?include_inactive=true`);
      if (res.ok) {
        const json = await res.json();
        setPlans(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth(`${API_URL}/admin/billing/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: "", code: "", description: "", price_mxn: 0, max_contacts: 100, max_whatsapp_sessions: 1, max_campaigns_per_month: 0 });
      fetchPlans();
    } catch {
      // silent
    }
  };

  const handleToggle = async (planId: string, currentActive: boolean) => {
    try {
      await fetchWithAuth(`${API_URL}/admin/billing/plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchPlans();
    } catch {
      // silent
    }
  };

  if (!user || user.role !== "superadmin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Acceso denegado
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los planes de suscripción
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nuevo Plan"}
        </Button>
      </section>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Nuevo Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Precio MXN</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={form.price_mxn}
                  onChange={(e) =>
                    setForm({ ...form, price_mxn: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contacts">Max Contactos</Label>
                <Input
                  id="contacts"
                  type="number"
                  value={form.max_contacts}
                  onChange={(e) =>
                    setForm({ ...form, max_contacts: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sessions">Max Sesiones WhatsApp</Label>
                <Input
                  id="sessions"
                  type="number"
                  value={form.max_whatsapp_sessions}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_whatsapp_sessions: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="campaigns">Campañas/mes</Label>
                <Input
                  id="campaigns"
                  type="number"
                  value={form.max_campaigns_per_month}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_campaigns_per_month: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <Label htmlFor="desc">Descripción</Label>
                <Input
                  id="desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="md:col-span-3">
                Crear Plan
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {plans.length} planes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Cargando…
            </div>
          ) : plans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? "default" : "outline"}>
                        {plan.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.code}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-2xl font-bold">
                      ${Number(plan.price_mxn).toLocaleString()}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        MXN/mes
                      </span>
                    </p>

                    <div className="mt-2 flex flex-col gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contactos</span>
                        <span>{plan.max_contacts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Sesiones WhatsApp
                        </span>
                        <span>{plan.max_whatsapp_sessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Campañas/mes
                        </span>
                        <span>{plan.max_campaigns_per_month}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className={
                        plan.is_active
                          ? "mt-2 text-destructive"
                          : "mt-2 text-success"
                      }
                      onClick={() => handleToggle(plan.id, plan.is_active)}
                    >
                      {plan.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No hay planes creados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
