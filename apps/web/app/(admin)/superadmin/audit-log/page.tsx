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
import { API_URL, fetchWithAuth } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth-store";

interface AuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  company_id: string | null;
  target_id: string | null;
  target_type: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
}

const actionColors: Record<string, string> = {
  "user.login": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "user.logout": "bg-gray-100 text-gray-800",
  "user.created": "bg-green-100 text-green-800",
  "user.disabled": "bg-red-100 text-red-800",
  "company.created": "bg-green-100 text-green-800",
  "company.disabled": "bg-red-100 text-red-800",
  "subscription.created": "bg-purple-100 text-purple-800",
  "subscription.cancelled": "bg-orange-100 text-orange-800",
  "plan.created": "bg-teal-100 text-teal-800",
  "plan.updated": "bg-teal-100 text-teal-800",
  "session.paused": "bg-yellow-100 text-yellow-800",
  "session.resumed": "bg-green-100 text-green-800",
};

function getActionColor(action: string): string {
  return actionColors[action] ?? "bg-muted text-muted-foreground";
}

export default function AuditLogPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/");
    }
  }, [user, router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetchWithAuth(`${API_URL}/admin/audit-log?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!user || user.role !== "superadmin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Acceso denegado
        </CardContent>
      </Card>
    );
  }

  const uniqueActions = data?.items
    ? [...new Set(data.items.map((i) => i.action))]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Auditoría
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro de eventos del sistema
        </p>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={actionFilter === "" ? "default" : "outline"}
          onClick={() => {
            setActionFilter("");
            setPage(0);
          }}
        >
          Todas
        </Button>
        {uniqueActions.slice(0, 10).map((action) => (
          <Button
            key={action}
            size="sm"
            variant={actionFilter === action ? "default" : "outline"}
            onClick={() => {
              setActionFilter(action);
              setPage(0);
            }}
          >
            {action}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {data ? `${data.total} eventos` : "Eventos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Cargando…
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="flex flex-col gap-1">
              {data.items.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-sm border px-4 py-2.5 text-sm"
                >
                  <Badge className={getActionColor(entry.action)}>
                    {entry.action}
                  </Badge>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium">
                      {entry.description ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.actor_email ?? "sistema"}
                      {entry.target_type ? ` · ${entry.target_type}` : ""}
                      {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}

              {data.total > pageSize && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">
                    {page + 1} / {Math.ceil(data.total / pageSize)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(page + 1) * pageSize >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No hay eventos registrados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
