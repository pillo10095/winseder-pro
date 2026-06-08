'use client';

import { LabelMappingsTable } from '@/components/crm/automation/label-mappings-table';

export default function AutomationLabelsPage() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Mapeá etiquetas de WhatsApp a etapas del pipeline. Cuando un contacto recibe una etiqueta en WhatsApp,
        su deal se mueve automáticamente a la etapa seleccionada.
      </p>
      <LabelMappingsTable />
    </div>
  );
}
