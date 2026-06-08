'use client';

import { ActivityFeed } from '@/components/crm/activities/activity-feed';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Actividades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial de todas las actividades del CRM.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-1 size-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Feed */}
      <div className="rounded-sm border border-border p-4">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Recientes
        </h3>
        <ActivityFeed limit={20} />
      </div>
    </div>
  );
}
