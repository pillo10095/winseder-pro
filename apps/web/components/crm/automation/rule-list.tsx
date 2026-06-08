'use client';

import { useState, useEffect } from 'react';
import { useAutomationStore } from '@/stores/automation-store';
import { useLabels } from '@/src/hooks/use-labels';
import { RuleCard } from './rule-card';
import { RuleFormDialog } from './rule-form-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import type { AutomationRule } from '@/lib/rule-engine';

export function RuleList() {
  const { rules, isLoading, loadRules, addRule } = useAutomationStore();
  const { labels, fetchLabels } = useLabels();
  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadRules();
    fetchLabels('current');
  }, [loadRules, fetchLabels]);

  const safeLabels = Array.isArray(labels) ? labels : [];
  const labelsMap = Object.fromEntries(
    safeLabels.map(l => [l.id, { name: l.name, color: l.color }]),
  );

  const handleSave = (
    data: Omit<AutomationRule, 'id' | 'created_at'>
  ) => {
    addRule(data);
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditRule(rule);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rules.length}{' '}
          {rules.length === 1
            ? 'regla configurada'
            : 'reglas configuradas'}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditRule(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 size-3.5" />
          Nueva Regla
        </Button>
      </div>

      {/* Empty state */}
      {rules.length === 0 && (
        <div className="rounded-sm border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay reglas de automatización.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Creá tu primera regla para empezar a automatizar.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-1 size-3.5" />
            Crear Regla
          </Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {rules.map(rule => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onEdit={handleEdit}
            labelsMap={labelsMap}
          />
        ))}
      </div>

      <RuleFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRule(null);
        }}
        onSave={handleSave}
        editRule={editRule}
      />
    </div>
  );
}
