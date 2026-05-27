'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DealCard } from './deal-card';
import type { DealCard as DealCardType } from '../../hooks/use-pipeline';

interface SortableDealCardProps {
  deal: DealCardType;
}

export function SortableDealCard({ deal }: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} />
    </div>
  );
}
