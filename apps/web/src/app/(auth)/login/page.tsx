"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/src/stores/auth-store";

function setSessionCookie(token: string) {
  document.cookie = `session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
      return;
    }

    login("admin@wisender.com", "admin123")
      .then(() => {
        const token = useAuthStore.getState().token;
        if (token) setSessionCookie(token);
        setStatus("success");
        router.replace("/");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Iniciando sesión…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-destructive">No se pudo iniciar sesión automáticamente</p>
      </div>
    );
  }

  return null;
}
