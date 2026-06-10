"use client";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-3 flex size-12 items-center justify-center border-2 border-dashed border-muted-foreground/30">
          <span className="text-xs font-bold text-muted-foreground/50">
            {"//"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No hay sesiones WhatsApp registradas.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Conectá una sesión para ver el dashboard anti-ban.
        </p>
      </CardContent>
    </Card>
  );
}
