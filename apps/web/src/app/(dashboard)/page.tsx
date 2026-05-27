'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePipeline } from '@/src/hooks/use-pipeline';
import { useDeals } from '@/src/hooks/use-deals';
import { useActivities } from '@/src/hooks/use-activities';
import { BarChart3, DollarSign, TrendingUp, Target, ArrowRight, PieChart } from 'lucide-react';

export default function DashboardPage() {
  const { stages, deals, loading: pipeLoading, fetchPipeline, filteredDeals } = usePipeline();
  const { deals: allDeals, fetchDeals } = useDeals();
  const { activities, fetchActivities } = useActivities();

  useEffect(() => {
    fetchPipeline('current');
    fetchDeals('current');
    fetchActivities('current');
  }, [fetchPipeline, fetchDeals, fetchActivities]);

  const totalPipeline = deals.reduce((s, d) => s + d.value, 0);
  const wonDeals = deals.filter((d) => d.stage_id === '5');
  const lostDeals = deals.filter((d) => d.stage_id === '6');
  const closedCount = wonDeals.length + lostDeals.length;
  const conversionRate = closedCount > 0
    ? Math.round((wonDeals.length / closedCount) * 100)
    : 0;

  // Analytics from full deal list
  const allWon = allDeals.filter((d) => d.pipeline_stage_id === '5');
  const allLost = allDeals.filter((d) => d.pipeline_stage_id === '6');
  const wonTotalValue = allWon.reduce((s, d) => s + d.value, 0);
  const lostTotalValue = allLost.reduce((s, d) => s + d.value, 0);
  const wonAvgValue = allWon.length > 0 ? Math.round(wonTotalValue / allWon.length) : 0;
  const lostAvgValue = allLost.length > 0 ? Math.round(lostTotalValue / allLost.length) : 0;

  const stageMetrics = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage_id === stage.id);
    const value = stageDeals.reduce((s, d) => s + d.value, 0);
    const maxValue = Math.max(...stages.map((s) =>
      deals.filter((d) => d.stage_id === s.id).reduce((sum, d) => sum + d.value, 0)
    ), 1);
    return { ...stage, deals: stageDeals.length, value, pct: Math.round((value / maxValue) * 100) };
  });

  const topDeals = [...deals].sort((a, b) => b.value - a.value).slice(0, 5);
  const recentActivities = activities.slice(0, 5);

  if (pipeLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-sm border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline overview · {deals.length} deals · ${totalPipeline.toLocaleString()}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
          { label: 'Active Deals', value: deals.length.toString(), icon: BarChart3, color: 'text-info' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-success' },
          { label: 'Closed Won', value: `$${wonDeals.reduce((s, d) => s + d.value, 0).toLocaleString()}`, icon: Target, color: 'text-success' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-sm border border-border bg-card p-4 card-constructivist">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className={`mt-2 text-2xl font-semibold text-foreground`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline value by stage */}
      <div className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Pipeline by Stage</h2>
        <div className="mt-4 space-y-3">
          {stageMetrics.map((stage) => (
            <div key={stage.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rotate-45" style={{ backgroundColor: stage.color }} />
                  <span className="text-foreground">{stage.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {stage.deals} deals · ${stage.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full rounded-sm bg-muted-light overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Won/Lost Analytics */}
      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Won / Lost Analytics</h2>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Closed Won</span>
            <p className="mt-1 text-2xl font-semibold text-success">{allWon.length}</p>
            <p className="text-sm text-muted-foreground">${wonTotalValue.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Closed Lost</span>
            <p className="mt-1 text-2xl font-semibold text-destructive">{allLost.length}</p>
            <p className="text-sm text-muted-foreground">${lostTotalValue.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Won Deal</span>
            <p className="mt-1 text-2xl font-semibold text-foreground">${wonAvgValue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">per closed won</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Lost Deal</span>
            <p className="mt-1 text-2xl font-semibold text-foreground">${lostAvgValue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">per closed lost</p>
          </div>
        </div>

        {/* Win rate bar */}
        {closedCount > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Win rate</span>
              <span className="font-medium text-foreground">{conversionRate}%</span>
            </div>
            <div className="h-3 w-full rounded-sm bg-muted-light overflow-hidden flex">
              <div
                className="h-full rounded-sm bg-success transition-all duration-500"
                style={{ width: `${conversionRate}%` }}
              />
              <div
                className="h-full rounded-sm bg-destructive transition-all duration-500"
                style={{ width: `${100 - conversionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{allWon.length} won ({conversionRate}%)</span>
              <span>{allLost.length} lost ({100 - conversionRate}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: top deals + recent activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top deals */}
        <div className="rounded-sm border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Top Deals</h2>
            <Link href="/crm/deals" className="flex items-center gap-1 text-xs text-primary hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deals yet</p>
            ) : (
              topDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/crm/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-sm px-3 py-2 text-sm bg-muted-light hover:bg-muted-light/80 transition-colors"
                >
                  <span className="text-foreground truncate">{deal.name}</span>
                  <span className="font-medium text-foreground shrink-0 ml-2">
                    ${deal.value.toLocaleString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-sm border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <Link href="/crm/activities" className="flex items-center gap-1 text-xs text-primary hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities yet</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 rounded-sm px-3 py-2 text-sm bg-muted-light">
                  <div className="h-2 w-2 mt-1.5 shrink-0 rounded-sm bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{act.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {act.activity_date ? new Date(act.activity_date).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className="text-xs capitalize text-muted-foreground shrink-0">{act.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
