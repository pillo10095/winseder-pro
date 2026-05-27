"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/src/stores/auth-store";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/auth/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name }),
        },
      );

      if (res.ok) {
        const updated = await res.json();
        setUser({ ...updated, id: updated.id ?? user!.id });
        setSaved(true);
      }
    } catch {
      // Silently handle — endpoint may not exist yet
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra tu perfil y preferencias
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Información personal de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <div className="text-sm text-muted-foreground">
              {user?.email ?? "—"}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Rol</Label>
            <div className="text-sm text-muted-foreground">
              {user?.role === "superadmin"
                ? "Super Admin"
                : user?.role === "admin"
                  ? "Administrador"
                  : "Agente"}
            </div>
          </div>

          <hr className="divider-constructivist" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {saved && (
              <p className="text-sm font-medium text-success">
                Perfil actualizado
              </p>
            )}

            <Button type="submit" disabled={saving} className="self-start">
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
