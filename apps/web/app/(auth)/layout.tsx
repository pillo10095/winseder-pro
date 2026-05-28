import type { ReactNode } from "react";

import { DateTime } from "@/components/shared/date-time";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="geo-block w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center bg-primary">
            <span className="text-xl font-bold text-primary-foreground">W</span>
          </div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">
            Wisender<span className="text-primary">.</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma omnicanal para tu equipo
          </p>
        </div>

        {children}

        <div className="mt-8 border-t border-border/40 pt-6 text-center">
          <DateTime />
        </div>
      </div>
    </div>
  );
}
