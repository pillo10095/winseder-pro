"use client";

import { useEffect, useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";

import { API_URL } from "@/src/lib/api";

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

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Get auth headers from localStorage */
  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/whatsapp/sessions`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data ?? data ?? []);
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

  const createSession = async () => {
    if (!sessionName.trim()) return;
    setCreating(true);
    setError(null);
    setQrCode(null);

    try {
      const res = await fetch(`${API_URL}/whatsapp/sessions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ session_name: sessionName.trim() }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let details = "";
        try { const j = JSON.parse(text); details = j?.error?.message ?? j?.message ?? text.slice(0, 200) } catch { details = text.slice(0, 200) }
        throw new Error(details || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      const sessionId = data.data?.id ?? data.id;

      setActiveSession(sessionId);
      setSessionName("");
      setPolling(true);
      await fetchSessions();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const fetchQr = useCallback(async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`${API_URL}/whatsapp/sessions/${activeSession}/qr`, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        setQrCode(data.data?.qr ?? data.qr ?? null);

        // Also check status
        const statusRes = await fetch(`${API_URL}/whatsapp/sessions/${activeSession}/status`, { headers: getHeaders() });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const newStatus = statusData.data?.status ?? statusData.status;
          if (newStatus === "connected") {
            setPolling(false);
            setQrCode(null);
            setActiveSession(null);
            fetchSessions();
          }
        }
      }
    } catch {
      // silent
    }
  }, [activeSession, fetchSessions]);

  useEffect(() => {
    if (!polling || !activeSession) return;
    const interval = setInterval(fetchQr, 3000);
    fetchQr();
    return () => clearInterval(interval);
  }, [polling, activeSession, fetchQr]);

  const deleteSession = async (id: string) => {
    try {
      await fetch(`${API_URL}/whatsapp/sessions/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
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

      {/* Create session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nueva sesión</CardTitle>
          <CardDescription>
            Ingresá un nombre para identificar la sesión (ej: "Ventas", "Soporte").
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="session-name">Nombre de la sesión</Label>
              <Input
                id="session-name"
                placeholder="Ej: Ventas principal"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSession()}
              />
            </div>
            <Button onClick={createSession} disabled={creating || !sessionName.trim()}>
              {creating ? "Creando..." : "Crear sesión"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

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
              El QR se actualiza automáticamente. Esperá a que el estado cambie a "Conectado".
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
                No hay sesiones de WhatsApp.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Creá una sesión nueva para empezar.
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
