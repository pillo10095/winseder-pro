"use client";

import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/src/components/layout/user-menu";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { label: "Dashboard", href: "/superadmin" },
  { label: "Empresas", href: "/superadmin/companies" },
  { label: "Planes", href: "/superadmin/plans" },
  { label: "Facturación", href: "/superadmin/billing" },
  { label: "Auditoría", href: "/superadmin/audit-log" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[100dvh] bg-muted/10">
      {/* Admin Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
          <div className="flex size-8 items-center justify-center bg-destructive text-xs font-bold text-destructive-foreground">
            SA
          </div>
          <span className="font-sans text-base font-bold tracking-tight">
            SuperAdmin
          </span>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1 p-4">
          {adminNavItems.map(({ label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Button
                key={href}
                asChild
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "justify-start text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-constructivist"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                <a href={href}>{label}</a>
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/50 p-4">
          <Button asChild variant="ghost" className="w-full justify-start text-xs text-muted-foreground">
            <a href="/">&larr; Volver al Panel</a>
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6 dark:bg-card">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Administración
          </p>
          <UserMenu />
        </header>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
