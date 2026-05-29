'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { LeadCard } from './lead-card';
import { LeadDetailDialog } from './lead-detail-dialog';
import { useCRMStore } from '@/stores/crm-store';
import { PIPELINE_STAGES, getLeadStageKey } from '@/types/crm';
import type { PipelineLead } from '@/types/crm';

export function KanbanBoard() {
  const { leads, isLoading, error, loadLeads, loadStats, moveLead } = useCRMStore();
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    loadLeads();
    loadStats();
  }, [loadLeads, loadStats]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as PipelineLead;
    if (lead) {
      setActiveLead(lead);
      setActiveStage(getLeadStageKey(lead));
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveLead(null);
      setActiveStage(null);

      const { active, over } = event;
      if (!over) return;

      const leadId = active.id as string;
      const targetColumnId = over.id as string;
      const newStage = targetColumnId.replace('column-', '');

      if (newStage && newStage !== activeStage) {
        moveLead(leadId, newStage);
      }
    },
    [moveLead, activeStage],
  );

  const getLeadsByStage = (stageKey: string) =>
    leads.filter(l => getLeadStageKey(l) === stageKey);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => loadLeads()}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando pipeline...</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            leads={getLeadsByStage(stage.key)}
            onSelectLead={setSelectedLead}
            onAddLead={s => {
              /* NewLeadDialog handle */
            }}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-3 opacity-90">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>

      <LeadDetailDialog
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </DndContext>
  );
}
