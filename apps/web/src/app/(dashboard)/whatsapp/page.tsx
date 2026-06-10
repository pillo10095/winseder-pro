"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { API_URL, fetchWithAuth } from "@/src/lib/api";

type Session = {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  phone_number?: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  connecting: "Conectando",
  error: "Error",
};

const STATUS_VARIANTS: Record<string, string> = {
  connected: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  disconnected: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  connecting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const DEFAULT_SESSION_NAMES = [
  "WhatsApp Principal",
  "WhatsApp Ventas",
  "WhatsApp Soporte",
];

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeSession = (s: any): Session => ({
    id: s.id,
    name: s.name ?? s.session_name ?? "",
    status: (s.status ?? "disconnected").toLowerCase() as Session["status"],
    phone_number: s.phone_number ?? s.phoneNumber,
    created_at: s.created_at ?? s.createdAt ?? "",
  });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/sessions`);
      if (res.ok) {
        const data = await res.json();
        const raw = data.data ?? data ?? [];
        setSessions(Array.isArray(raw) ? raw.map(normalizeSession) : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-create a session if none exist
  useEffect(() => {
    if (loading || creating || sessions.length > 0) return;

    const namesInUse = new Set(sessions.map((s) => s.name));
    const name = DEFAULT_SESSION_NAMES.find((n) => !namesInUse.has(n))
      ?? `WhatsApp ${new Date().toLocaleDateString("es-AR")} - ${Date.now()}`;

    setCreating(true);

    fetchWithAuth(`${API_URL}/whatsapp/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_name: name }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
        const data = await res.json();
        const id = data.data?.id ?? data.id;
        setActiveSession(id);
        setPolling(true);
        await fetchSessions();
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setCreating(false));
  }, [loading, sessions]);

  // Auto-show QR for the first session that needs scanning
  useEffect(() => {
    if (loading || activeSession || sessions.length === 0) return;
    const needsQr = sessions.find((s) => s.status === "connecting" || s.status === "error");
    if (needsQr) {
      setActiveSession(needsQr.id);
      setPolling(true);
    }
  }, [loading, sessions, activeSession]);

  const fetchQr = useCallback(async () => {
    if (!activeSession) return;

    try {
      const [qrRes, statusRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/whatsapp/sessions/${activeSession}/qr`),
        fetchWithAuth(`${API_URL}/whatsapp/sessions/${activeSession}/status`),
      ]);

      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrCode(data.data?.qr ?? data.qr ?? null);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const newStatus = (statusData.data?.status ?? statusData.status ?? "").toLowerCase();
        if (newStatus === "connected") {
          setPolling(false);
          setQrCode(null);
          setActiveSession(null);
          fetchSessions();
          fetchWithAuth(`${API_URL}/whatsapp/sessions/${activeSession}/extract-contacts`, {
            method: "POST",
          }).catch(() => {});
        }
      }
    } catch {
      // silent
    }
  }, [activeSession, fetchSessions]);

  useEffect(() => {
    if (!polling || !activeSession) return;
    fetchQr();
    const interval = setInterval(fetchQr, 5000);
    return () => clearInterval(interval);
  }, [polling, activeSession, fetchQr]);

  const deleteSession = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/whatsapp/sessions/${id}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent
    }
  };

  const viewQr = async (id: string) => {
    setActiveSession(id);
    setPolling(true);
    await fetchQr();
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sesiones de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná tus sesiones de WhatsApp conectadas a Wisender.
        </p>

      </section>

      <Separator className="divider-constructivist" />

      {/* QR display */}
      {polling && activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Escanear QR</CardTitle>
            <CardDescription>
              Escaneá el código QR con WhatsApp en tu celular.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            {qrCode ? (
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="size-64 border-2 border-primary/20"
              />
            ) : (
              <div className="flex size-64 items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <p className="text-sm text-muted-foreground">Esperando QR...</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              El QR se actualiza automáticamente. Esperá a que el estado cambie a &quot;Conectado&quot;.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Session list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sesiones existentes</CardTitle>
          <CardDescription>
            {sessions.length === 0
              ? "No hay sesiones creadas todavía."
              : `${sessions.length} sesión(es) registrada(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-3 flex size-12 items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <span className="text-xs font-bold text-muted-foreground/50">{'//'}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Creando sesión de WhatsApp…
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-sm border border-border p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm font-bold">
                        {session.name}
                      </span>
                      <span
                        className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_VARIANTS[session.status] ?? ""
                        }`}
                      >
                        {STATUS_LABELS[session.status] ?? session.status}
                      </span>
                    </div>
                    {session.phone_number && (
                      <p className="text-xs text-muted-foreground">
                        {session.phone_number}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">
                      Creada: {new Date(session.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status !== "connected" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewQr(session.id)}
                      >
                        QR
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteSession(session.id)}
                    >
                      Eliminar
                    </Button>
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
