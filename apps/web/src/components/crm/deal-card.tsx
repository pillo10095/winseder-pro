'use client';

import type { DealCard as DealCardType } from '../../hooks/use-pipeline';

interface DealCardProps {
  deal: DealCardType;
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <div className="card-constructivist rounded-sm px-3 py-3">
      <h4 className="text-sm font-medium text-foreground">{deal.name}</h4>

      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {deal.company_name && <span>{deal.company_name}</span>}
        {deal.contact_name && (
          <>
            {deal.company_name && <span>·</span>}
            <span>{deal.contact_name}</span>
          </>
        )}
      </div>

      <div className="mt-2 text-sm font-semibold text-foreground">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(deal.value)}
      </div>

      {deal.assigned_to && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
            {deal.assigned_to.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-muted-foreground">{deal.assigned_to}</span>
        </div>
      )}
    </div>
  );
}
