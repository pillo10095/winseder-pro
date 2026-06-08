'use client';

import { RulesTable } from '@/components/crm/automation/rules-table';

export default function AutomationRulesPage() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Definí reglas que disparan acciones automáticas cuando ocurren eventos en WhatsApp o en el pipeline.
      </p>
      <RulesTable />
    </div>
  );
}
