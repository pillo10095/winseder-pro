'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeadCard } from './lead-card';
import type { PipelineLead } from '@/types/crm';

interface KanbanColumnProps {
  stage: { key: string; label: string; color: string };
  leads: PipelineLead[];
  onSelectLead: (lead: PipelineLead) => void;
  onAddLead: (stage: string) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  stage,
  leads,
  onSelectLead,
  onAddLead,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.key}`,
    data: { stage: stage.key },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <Card className={`${isOver ? 'ring-2 ring-primary/30' : ''}`}>
        <CardHeader className="border-b border-border/50 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-bold">
                {stage.label}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="rounded-sm text-[11px] font-bold"
            >
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <div
          ref={setNodeRef}
          className="min-h-[120px] space-y-2 p-2"
        >
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs text-muted-foreground/60">Sin leads</p>
              <button
                onClick={() => onAddLead(stage.key)}
                className="mt-2 text-[11px] text-primary hover:underline"
              >
                + Agregar lead
              </button>
            </div>
          )}
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))}
        </div>
      </Card>
    </div>
  );
});
