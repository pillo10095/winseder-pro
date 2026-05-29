'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityTimeline } from './activity-timeline';
import { Phone, MessageSquare, Calendar } from 'lucide-react';
import type { PipelineLead } from '@/types/crm';
import {
  ORIGEN_LABELS,
  getLeadName,
  getLeadPhone,
  getLeadEmail,
  getLeadSource,
  getLeadNotes,
  getLeadAssignedName,
  getLeadValue,
  formatCurrency,
} from '@/types/crm';
import { fetchActivities } from '@/lib/crm-api';

interface LeadDetailDialogProps {
  lead: PipelineLead | null;
  onClose: () => void;
}

export function LeadDetailDialog({ lead, onClose }: LeadDetailDialogProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      setLoadingActivities(true);
      fetchActivities(lead.id)
        .then(setActivities)
        .catch(() => setActivities([]))
        .finally(() => setLoadingActivities(false));
    } else {
      setActivities([]);
    }
  }, [lead?.id]);

  if (!lead) return null;

  const source = getLeadSource(lead);
  const assignedName = getLeadAssignedName(lead);

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {getLeadName(lead)}
            </DialogTitle>
            {source && (
              <Badge variant="outline">
                {ORIGEN_LABELS[source] || source}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            {getLeadPhone(lead) && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Teléfono
                </p>
                <p className="flex items-center gap-1.5 text-sm">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {getLeadPhone(lead)}
                </p>
              </div>
            )}
            {getLeadEmail(lead) && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Email
                </p>
                <p className="text-sm">{getLeadEmail(lead)}</p>
              </div>
            )}
            {lead.company_name && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Interés
                </p>
                <p className="text-sm">{lead.company_name}</p>
              </div>
            )}
            {getLeadValue(lead) > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Valor estimado
                </p>
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(getLeadValue(lead))}
                </p>
              </div>
            )}
          </div>

          {/* Assignee + Next action */}
          {(assignedName || lead.next_action) && (
            <div className="grid grid-cols-2 gap-3">
              {assignedName && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Asignado a
                  </p>
                  <p className="text-sm">{assignedName}</p>
                </div>
              )}
              {lead.next_action && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Próxima acción
                  </p>
                  <p className="text-sm">{lead.next_action}</p>
                  {lead.next_action_date && (
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(lead.next_action_date).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {getLeadNotes(lead) && (
            <>
              <Separator className="divider-constructivist" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Notas
                </p>
                <p className="text-sm text-muted-foreground">{getLeadNotes(lead)}</p>
              </div>
            </>
          )}

          <Separator className="divider-constructivist" />

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Phone className="size-3.5" /> Llamar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquare className="size-3.5" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="size-3.5" /> Agendar
            </Button>
          </div>

          <Separator className="divider-constructivist" />

          {/* Activity timeline */}
          <div>
            <h4 className="mb-3 text-sm font-bold">Actividad reciente</h4>
            {loadingActivities ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
