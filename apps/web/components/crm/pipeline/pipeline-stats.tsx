'use client';

import { TrendingUp, DollarSign, Target, PieChart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCRMStore } from '@/stores/crm-store';
import { formatCurrency } from '@/types/crm';

export function PipelineStats() {
  const { stats } = useCRMStore();

  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Total Leads',
      value: String(stats.total_deals),
      icon: PieChart,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(stats.total_value),
      icon: DollarSign,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Valor Promedio',
      value: formatCurrency(stats.avg_value),
      icon: Target,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Tasa de Conversión',
      value: `${stats.conversion_rate}%`,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-sm ${item.color}`}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-lg font-bold tracking-tight">
                  {item.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
