"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/src/stores/auth-store";

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await logout();
    window.location.href = "/login";
  }, [logout]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-sm p-1 transition-colors hover:bg-primary/5"
      >
        <Avatar className="size-9 rounded-none">
          <AvatarFallback className="rounded-none bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left md:block">
          <p className="font-sans text-sm font-bold">{user?.name ?? "Usuario"}</p>
          <p className="text-xs text-muted-foreground">
            {user?.email ?? "—"}
          </p>
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-sm border border-border bg-card shadow-constructivist">
            <div className="border-b border-border/50 px-4 py-3">
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>

            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm font-medium"
                asChild
              >
                <Link href="/settings" onClick={() => setOpen(false)}>
                  Configuración
                </Link>
              </Button>
            </div>

            <div className="border-t border-border/50 p-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
