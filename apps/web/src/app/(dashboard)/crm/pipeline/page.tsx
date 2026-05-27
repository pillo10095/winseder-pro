'use client';

import { useEffect } from 'react';
import { KanbanBoard } from '@/src/components/crm/kanban-board';

export default function PipelinePage() {
  useEffect(() => {
    document.title = 'Pipeline - Wisender Pro';
  }, []);

  return (
    <div className="flex h-full flex-col">
      <KanbanBoard companyId="current" />
    </div>
  );
}
