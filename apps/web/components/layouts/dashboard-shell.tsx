import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/src/components/layout/user-menu";

type SidebarItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

export interface DashboardShellProps {
  sidebar?: SidebarItem[];
  children: React.ReactNode;
}

const defaultSidebarItems: SidebarItem[] = [
  { label: "Panel", href: "/", isActive: true },
  { label: "Campañas", href: "/campaigns" },
  { label: "Contactos", href: "/contacts" },
  { label: "Automatizaciones", href: "/automations" },
  { label: "IA", href: "/settings/ai" },
  { label: "Anti-Ban", href: "/anti-ban" },
];

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
  const items = sidebar ?? defaultSidebarItems;

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar — constructivist */}
      <aside className="geometric-frame hidden w-64 shrink-0 border-r border-border bg-white dark:bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
          <div className="flex size-8 items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
            W
          </div>
          <span className="font-sans text-base font-bold tracking-tight">
            Wisender
            <span className="text-primary">.</span>
          </span>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1 p-4">
          {items.map(({ label, href, isActive }) => (
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
          ))}
        </nav>

        {/* Constructivist decorative element */}
        <div className="mt-auto border-t border-border/50 p-4">
          <div className="geo-block rounded-sm bg-muted-light/50 p-3 dark:bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Wisender Pro
            </p>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground/60">
              v0.1 · Construtivismo
            </p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-end border-b border-border bg-white px-6 dark:bg-card">
          <UserMenu />
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
