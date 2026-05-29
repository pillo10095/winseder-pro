'use client';

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone } from 'lucide-react';
import type { PipelineLead } from '@/types/crm';
import {
  ORIGEN_LABELS,
  ORIGEN_COLORS,
  getLeadName,
  getLeadPhone,
  getLeadSource,
  getLeadAssignedName,
  getLeadValue,
  getDaysSince,
  formatCurrency,
} from '@/types/crm';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface LeadCardProps {
  lead: PipelineLead;
  onSelect?: (lead: PipelineLead) => void;
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
      }
    : undefined;

  const source = getLeadSource(lead);
  const assignedName = getLeadAssignedName(lead);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    >
      <Card
        className="card-constructivist cursor-grab active:cursor-grabbing"
        onClick={() => onSelect?.(lead)}
      >
        <CardContent className="space-y-2 p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {getInitials(getLeadName(lead))}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {getLeadName(lead)}
                </p>
                {lead.company_name && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {lead.company_name}
                  </p>
                )}
              </div>
            </div>
            {source && (
              <Badge
                variant="outline"
                className={`shrink-0 px-1.5 py-0 text-[10px] ${ORIGEN_COLORS[source] || ''}`}
              >
                {ORIGEN_LABELS[source] || source}
              </Badge>
            )}
          </div>

          {/* Phone */}
          {getLeadPhone(lead) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" />
              <span>{getLeadPhone(lead)}</span>
            </div>
          )}

          {/* Value + Activity */}
          <div className="flex items-center justify-between pt-1">
            {getLeadValue(lead) > 0 ? (
              <span className="text-sm font-bold text-primary">
                {formatCurrency(getLeadValue(lead))}
              </span>
            ) : (
              <span />
            )}
            <span className="text-[10px] text-muted-foreground/60">
              {getDaysSince(lead.last_activity_at || undefined)}
            </span>
          </div>

          {/* Assignee */}
          {assignedName && (
            <div className="flex items-center gap-1.5 border-t border-border/50 pt-1 text-[10px] text-muted-foreground/60">
              <span>Asignado a: {assignedName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
