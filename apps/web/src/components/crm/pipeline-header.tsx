'use client';

import { useState } from 'react';
import { DealForm } from './deal-form';
import { StageManager } from './stage-manager';
import type { DealStage } from '../../hooks/use-pipeline';

interface PipelineHeaderProps {
  totalDeals: number;
  totalValue: number;
  stages: DealStage[];
  assignedUsers: string[];
  filterAssigned: string;
  onFilterAssigned: (v: string) => void;
  filterValueMin: number;
  onFilterValueMin: (v: number) => void;
  filterValueMax: number;
  onFilterValueMax: (v: number) => void;
  onCreateDeal: (dto: any) => Promise<void>;
  onStagesChanged: () => void;
  companyId: string;
}

export function PipelineHeader({
  totalDeals,
  totalValue,
  stages,
  assignedUsers,
  filterAssigned,
  onFilterAssigned,
  filterValueMin,
  onFilterValueMin,
  filterValueMax,
  onFilterValueMax,
  onCreateDeal,
  onStagesChanged,
  companyId,
}: PipelineHeaderProps) {
  const [showDealForm, setShowDealForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);

  const handleSaveDeal = async (data: any) => {
    await onCreateDeal(data);
    setShowDealForm(false);
  };

  const hasActiveFilters = filterAssigned || filterValueMin > 0 || filterValueMax < Infinity;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {totalDeals} deals ·{' '}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(totalValue)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStageManager(true)}
            className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            Stages
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-sm border px-3 py-2 text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-primary bg-primary-muted text-primary'
                : 'border-border text-muted-foreground hover:bg-muted-light hover:text-foreground'
            }`}
          >
            Filter{hasActiveFilters ? ' (1)' : ''}
          </button>
          <button
            onClick={() => setShowDealForm(true)}
            className="rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all"
          >
            + Add Deal
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mx-6 mb-3 flex flex-wrap items-end gap-4 rounded-sm border border-border bg-card p-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned to</label>
            <select
              value={filterAssigned}
              onChange={(e) => onFilterAssigned(e.target.value)}
              className="mt-1 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">All</option>
              {assignedUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Min value</label>
            <input
              type="number"
              min={0}
              value={filterValueMin || ''}
              onChange={(e) => onFilterValueMin(Number(e.target.value) || 0)}
              className="mt-1 w-24 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Max value</label>
            <input
              type="number"
              min={0}
              value={filterValueMax === Infinity ? '' : filterValueMax}
              onChange={(e) => onFilterValueMax(Number(e.target.value) || Infinity)}
              className="mt-1 w-24 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              placeholder="∞"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { onFilterAssigned(''); onFilterValueMin(0); onFilterValueMax(Infinity); }}
              className="rounded-sm border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {showDealForm && (
        <DealForm
          stages={stages}
          onClose={() => setShowDealForm(false)}
          onSave={handleSaveDeal}
        />
      )}

      {showStageManager && (
        <StageManager
          companyId={companyId}
          onClose={() => setShowStageManager(false)}
          onSaved={onStagesChanged}
        />
      )}
    </>
  );
}
