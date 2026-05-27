'use client';

import type { DealStage } from '../../hooks/use-pipeline';

interface StageSelectorProps {
  stages: DealStage[];
  currentStageId: string;
  onSelect: (stageId: string) => void;
}

export function StageSelector({ stages, currentStageId, onSelect }: StageSelectorProps) {
  return (
    <div className="grid-asymmetric gap-2">
      {stages.map((stage) => {
        const isActive = stage.id === currentStageId;
        return (
          <button
            key={stage.id}
            onClick={() => onSelect(stage.id)}
            className={`rounded-sm px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'text-primary-foreground shadow-constructivist'
                : 'text-muted-foreground hover:text-foreground border border-border'
            }`}
            style={isActive ? { backgroundColor: stage.color } : undefined}
          >
            {stage.name}
          </button>
        );
      })}
    </div>
  );
}
