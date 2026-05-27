'use client';

import { StageSelector } from './stage-selector';
import type { DealStage } from '../../hooks/use-pipeline';

interface DealStageEditorProps {
  currentStageId: string;
  stages: DealStage[];
  probability: number;
  onStageChange: (stageId: string) => void;
  onProbabilityChange: (probability: number) => void;
}

export function DealStageEditor({
  currentStageId,
  stages,
  probability,
  onStageChange,
  onProbabilityChange,
}: DealStageEditorProps) {
  const current = stages.find((s) => s.id === currentStageId);

  return (
    <div className="grid-asymmetric gap-4">
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</span>
        <div className="mt-1">
          <StageSelector
            stages={stages}
            currentStageId={currentStageId}
            onSelect={onStageChange}
          />
        </div>
      </div>
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Probability</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={probability}
            onChange={(e) => onProbabilityChange(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-10 text-sm font-semibold text-foreground">{probability}%</span>
        </div>
      </div>
    </div>
  );
}
