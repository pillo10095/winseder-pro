'use client';

import { useState, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { PipelineHeader } from '@/components/crm/pipeline/pipeline-header';
import { KanbanBoard } from '@/components/crm/pipeline/kanban-board';
import { NewLeadDialog } from '@/components/crm/pipeline/new-lead-dialog';

export default function PipelinePage() {
  const [showNewLead, setShowNewLead] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = useCallback((query: string) => {
    setSearchValue(query);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PipelineHeader
        onNewLead={() => setShowNewLead(true)}
        onSearch={handleSearch}
        searchValue={searchValue}
      />

      <Separator className="divider-constructivist" />

      <KanbanBoard />

      <NewLeadDialog
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
      />
    </div>
  );
}
