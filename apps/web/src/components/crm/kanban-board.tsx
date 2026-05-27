'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { usePipeline, DealCard as DealCardType } from '../../hooks/use-pipeline';
import { KanbanColumn } from './kanban-column';
import { DealCard } from './deal-card';
import { PipelineHeader } from './pipeline-header';
import { WonLostModal } from './won-lost-modal';

interface KanbanBoardProps {
  companyId: string;
}

const CLOSED_WON = '5';
const CLOSED_LOST = '6';

export function KanbanBoard({ companyId }: KanbanBoardProps) {
  const {
    stages,
    deals,
    loading,
    fetchPipeline,
    fetchStages,
    moveDeal,
    createDeal,
    filterAssigned,
    setFilterAssigned,
    filterValueMin,
    setFilterValueMin,
    filterValueMax,
    setFilterValueMax,
    filteredDeals,
  } = usePipeline();

  const [activeDeal, setActiveDeal] = useState<DealCardType | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    dealId: string;
    targetStageId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    fetchPipeline(companyId);
  }, [companyId, fetchPipeline]);

  const assignedUsers = useMemo(
    () => [...new Set(deals.map((d) => d.assigned_to).filter(Boolean) as string[])],
    [deals],
  );

  const currentFilteredDeals = useMemo(
    () => filteredDeals(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, filterAssigned, filterValueMin, filterValueMax],
  );

  const { dealsByStage, totals } = useMemo(() => {
    const grouped: Record<string, DealCardType[]> = {};
    let count = 0;
    let value = 0;

    for (const stage of stages) {
      grouped[stage.id] = currentFilteredDeals.filter((d) => d.stage_id === stage.id);
    }

    if (stages.length > 0) {
      const firstId = stages[0].id;
      grouped[firstId] = [
        ...(grouped[firstId] || []),
        ...currentFilteredDeals.filter((d) => !stages.some((s) => s.id === d.stage_id)),
      ];
    }

    for (const d of currentFilteredDeals) {
      count++;
      value += d.value;
    }

    return { dealsByStage: grouped, totals: { count, value } };
  }, [currentFilteredDeals, stages]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deal = deals.find((d) => d.id === event.active.id);
      if (deal) setActiveDeal(deal);
    },
    [deals],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDeal(null);
      const { active, over } = event;
      if (!over) return;

      const dealId = active.id as string;
      const targetStageId = over.id as string;
      if (!dealId || !targetStageId) return;

      if (targetStageId === CLOSED_WON || targetStageId === CLOSED_LOST) {
        const currentDeal = deals.find((d) => d.id === dealId);
        if (currentDeal && currentDeal.stage_id !== targetStageId) {
          setPendingMove({ dealId, targetStageId });
          return;
        }
      }

      moveDeal(dealId, targetStageId);
    },
    [deals, moveDeal],
  );

  const handleWonLostConfirm = useCallback(() => {
    if (!pendingMove) return;
    moveDeal(pendingMove.dealId, pendingMove.targetStageId);
    setPendingMove(null);
  }, [pendingMove, moveDeal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-sm border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const targetStage = pendingMove
    ? stages.find((s) => s.id === pendingMove.targetStageId)
    : null;

  return (
    <div className="flex h-full flex-col">
      <PipelineHeader
        totalDeals={totals.count}
        totalValue={totals.value}
        stages={stages}
        assignedUsers={assignedUsers}
        filterAssigned={filterAssigned}
        onFilterAssigned={setFilterAssigned}
        filterValueMin={filterValueMin}
        onFilterValueMin={setFilterValueMin}
        filterValueMax={filterValueMax}
        onFilterValueMax={setFilterValueMax}
        onCreateDeal={async (dto) => { await createDeal(companyId, dto); }}
        onStagesChanged={fetchStages}
        companyId={companyId}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto px-6 pb-6">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && targetStage && (
        <WonLostModal
          dealId={pendingMove.dealId}
          dealName={deals.find((d) => d.id === pendingMove.dealId)?.name || ''}
          targetStageId={pendingMove.targetStageId}
          targetStageName={targetStage.name}
          onConfirm={handleWonLostConfirm}
          onClose={() => setPendingMove(null)}
        />
      )}
    </div>
  );
}
