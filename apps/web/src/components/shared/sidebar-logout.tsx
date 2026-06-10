"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/src/stores/auth-store";

export function SidebarLogout() {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = "/login";
  }, [logout]);

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleLogout}
    >
      Cerrar sesión
    </Button>
  );
}
