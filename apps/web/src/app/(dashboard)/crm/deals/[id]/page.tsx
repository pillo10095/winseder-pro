'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useDeals } from '@/src/hooks/use-deals';
import { useActivities } from '@/src/hooks/use-activities';
import { usePipeline } from '@/src/hooks/use-pipeline';
import { DealStageEditor } from '@/src/components/crm/deal-stage-editor';
import { ActivityForm } from '@/src/components/crm/activity-form';
import { ActivityTimeline } from '@/src/components/crm/activity-timeline';
import { WonLostModal } from '@/src/components/crm/won-lost-modal';
import { fetchWithAuth } from '@/src/lib/api';
import { ArrowLeft } from 'lucide-react';

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { current, currentLoading, fetchDealById } = useDeals();
  const { createActivity, fetchActivities, activities } = useActivities();
  const { stages, fetchStages } = usePipeline();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showWonLost, setShowWonLost] = useState<{ targetStageId: string; targetStageName: string } | null>(null);

  useEffect(() => {
    fetchDealById(params.id);
    fetchStages();
  }, [params.id, fetchDealById, fetchStages]);

  useEffect(() => {
    if (current?.id) {
      fetchActivities('current', undefined, undefined, current.id);
    }
  }, [current?.id, fetchActivities]);

  const handleStageChange = useCallback(
    async (stageId: string) => {
      if (!current) return;

      if (stageId === '5' || stageId === '6') {
        const stage = stages.find((s) => s.id === stageId);
        setShowWonLost({ targetStageId: stageId, targetStageName: stage?.name || '' });
        return;
      }

      await doStageChange(stageId);
    },
    [current, stages],
  );

  const doStageChange = useCallback(
    async (stageId: string, reason?: string) => {
      if (!current) return;

      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/crm/deals/${current.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage_id: stageId, reason }),
      });

      const stage = stages.find((s) => s.id === stageId);
      await createActivity('current', {
        type: 'note',
        description: `Stage changed to "${stage?.name || stageId}"`,
        deal_id: current.id,
      });

      fetchDealById(current.id);
      fetchActivities('current', undefined, undefined, current.id);
    },
    [current, stages, createActivity, fetchDealById, fetchActivities],
  );

  const handleProbabilityChange = useCallback(
    async (probability: number) => {
      if (!current) return;

      await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/crm/deals/${current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ probability }),
      });

      fetchDealById(current.id);
    },
    [current, fetchDealById],
  );

  const handleLogActivity = useCallback(
    async (data: { type: string; description: string }) => {
      if (!current) return;
      await createActivity('current', { ...data, deal_id: current.id });
      setShowActivityForm(false);
      fetchActivities('current', undefined, undefined, current.id);
    },
    [current, createActivity, fetchActivities],
  );

  if (currentLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-sm border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!current && !currentLoading) {
    notFound();
    return null;
  }

  const isClosed = current!.pipeline_stage_id === '5' || current!.pipeline_stage_id === '6';

  return (
    <div className="space-y-6 p-6">
      <Link href="/crm/deals" className="geometric-frame inline-flex items-center gap-1.5 pl-3 py-1 text-sm text-primary hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Deals
      </Link>

      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{current!.name}</h1>
            <p className="text-sm text-muted-foreground">{current!.company_name || '—'}</p>
          </div>
          <div className="flex gap-2">
            {!isClosed && (
              <>
                <button
                  onClick={() => {
                    const s = stages.find((st) => st.id === '5');
                    setShowWonLost({ targetStageId: '5', targetStageName: s?.name || 'Closed Won' });
                  }}
                  className="rounded-sm bg-success px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
                >
                  Mark as Won
                </button>
                <button
                  onClick={() => {
                    const s = stages.find((st) => st.id === '6');
                    setShowWonLost({ targetStageId: '6', targetStageName: s?.name || 'Closed Lost' });
                  }}
                  className="rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
                >
                  Mark as Lost
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid-asymmetric gap-4 mt-6">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Value</span>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              ${current!.value.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</span>
            <p className="mt-1">
              <span className="inline-flex rounded-sm px-2 py-1 text-xs font-medium bg-muted-light text-muted-foreground">
                {stages.find(s => s.id === current!.pipeline_stage_id)?.name || 'Unknown'}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-sm bg-muted-light p-4 geometric-frame">
          <DealStageEditor
            currentStageId={current!.pipeline_stage_id}
            stages={stages}
            probability={current!.probability}
            onStageChange={handleStageChange}
            onProbabilityChange={handleProbabilityChange}
          />
        </div>

        <div className="grid-asymmetric gap-4 mt-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Close Date</span>
            <p className="mt-1 text-sm text-foreground">
              {current!.close_date ? new Date(current!.close_date).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned</span>
            <p className="mt-1 text-sm text-foreground">{current!.assigned_to || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</span>
            <p className="mt-1 text-sm text-primary">
              {current!.contact_id ? (
                <Link href={`/crm/contacts/${current!.contact_id}`}>View Contact</Link>
              ) : '—'}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</span>
            <p className="mt-1 text-sm text-foreground">{current!.company_name || '—'}</p>
          </div>
        </div>

        {current!.won_lost_reason && (
          <div className="mt-4 rounded-sm bg-muted-light p-4 geometric-frame">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {current!.pipeline_stage_id === '5' ? 'Won' : 'Lost'} Reason
            </span>
            <p className="mt-1 text-sm text-foreground">{current!.won_lost_reason}</p>
          </div>
        )}
      </div>

      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Activity Timeline</h2>
          <button
            onClick={() => setShowActivityForm(true)}
            className="rounded-sm border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            + Log Activity
          </button>
        </div>
        <div className="mt-3">
          <ActivityTimeline
            activities={activities.map((a) => ({
              id: a.id,
              type: a.type,
              description: a.description,
              date: a.activity_date ? new Date(a.activity_date).toLocaleString() : '',
              by: a.logged_by || '',
            }))}
          />
        </div>
      </div>

      {showActivityForm && (
        <ActivityForm
          onClose={() => setShowActivityForm(false)}
          onSave={handleLogActivity}
        />
      )}

      {showWonLost && (
        <WonLostModal
          dealId={current!.id}
          dealName={current!.name}
          targetStageId={showWonLost.targetStageId}
          targetStageName={showWonLost.targetStageName}
          onConfirm={async () => {
            await doStageChange(showWonLost.targetStageId);
            setShowWonLost(null);
          }}
          onClose={() => setShowWonLost(null)}
        />
      )}
    </div>
  );
}
