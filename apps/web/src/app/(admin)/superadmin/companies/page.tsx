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
import { API_URL, fetchWithAuth } from "@/src/lib/api";
import { useAuthStore } from "@/src/stores/auth-store";

interface CompanyItem {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface CompaniesResponse {
  items: CompanyItem[];
  total: number;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<CompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Auth guard
  useEffect(() => {
    if (user && user.role !== "superadmin") {
      router.push("/");
    }
  }, [user, router]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetchWithAuth(
        `${API_URL}/admin/companies?${params}`,
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggle = async (companyId: string, currentActive: boolean) => {
    try {
      await fetchWithAuth(`${API_URL}/admin/companies/${companyId}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchCompanies();
    } catch {
      // silent
    }
  };

  if (!user || user.role !== "superadmin") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Acceso denegado — solo superadmin
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona todas las empresas registradas
        </p>
      </section>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nombre o slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        <span className="self-center text-xs text-muted-foreground">
          {data ? `${data.total} empresas` : ""}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Todas las empresas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Cargando…
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="col-span-4">Nombre</span>
                <span className="col-span-3">Slug</span>
                <span className="col-span-2">Estado</span>
                <span className="col-span-2">Creada</span>
                <span className="col-span-1" />
              </div>

              {data.items.map((company) => (
                <div
                  key={company.id}
                  className="grid grid-cols-12 gap-2 rounded-sm border px-4 py-3 text-sm items-center"
                >
                  <span className="col-span-4 font-medium">
                    {company.name}
                  </span>
                  <span className="col-span-3 text-muted-foreground">
                    {company.slug}
                  </span>
                  <span className="col-span-2">
                    <Badge
                      variant={company.is_active ? "default" : "outline"}
                    >
                      {company.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </span>
                  <span className="col-span-2 text-xs text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString()}
                  </span>
                  <span className="col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={
                        company.is_active
                          ? "text-destructive hover:text-destructive"
                          : "text-success hover:text-success"
                      }
                      onClick={() => handleToggle(company.id, company.is_active)}
                    >
                      {company.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </span>
                </div>
              ))}

              {/* Pagination */}
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
                    Página {page + 1} de {Math.ceil(data.total / pageSize)}
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
              No se encontraron empresas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
