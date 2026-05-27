'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DealCard as DealCardComponent } from './deal-card';
import { SortableDealCard } from './sortable-deal-card';
import type { DealCard, DealStage } from '../../hooks/use-pipeline';

interface KanbanColumnProps {
  stage: DealStage;
  deals: DealCard[];
}

export function KanbanColumn({ stage, deals }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const stageValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-sm bg-muted-light transition-shadow ${
        isOver ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <div
          className="h-3 w-3 rotate-45"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-semibold text-foreground">{stage.name}</span>
        <span className="ml-auto rounded-sm bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>

      <div className="px-3 pb-2 pt-1 text-xs text-muted-foreground">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stageValue)}
      </div>

      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-3">
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
          {deals.length === 0 && (
            <div className="rounded-sm border-2 border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Drop deals here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
