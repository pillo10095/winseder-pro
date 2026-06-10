'use client';

import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PipelineStats } from './pipeline-stats';

interface PipelineHeaderProps {
  onNewLead: () => void;
  onSearch: (query: string) => void;
  searchValue: string;
}

export function PipelineHeader({ onNewLead, onSearch, searchValue }: PipelineHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Gestioná y seguí tus oportunidades comerciales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="w-64 pl-8"
              value={searchValue}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="size-4" />
          </Button>
          <Button onClick={onNewLead} className="gap-1.5">
            <Plus className="size-4" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <PipelineStats />
    </div>
  );
}
