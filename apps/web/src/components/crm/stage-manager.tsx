'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_URL, fetchWithAuth } from '../../lib/api';
import { ColorPicker } from './color-picker';
import { X, GripVertical } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  default_probability: number;
}

interface StageManagerProps {
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}

function SortableStageRow({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: Stage;
  onUpdate: (id: string, data: Partial<Stage>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-sm border bg-card px-4 py-3 ${
        isDragging ? 'shadow-constructivist' : 'border-border'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        <input
          type="text"
          value={stage.name}
          onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
          className="flex-1 rounded-sm border border-input bg-background px-2 py-1 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="w-20">
        <input
          type="number"
          min={0}
          max={100}
          value={stage.default_probability}
          onChange={(e) =>
            onUpdate(stage.id, { default_probability: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
          }
          className="w-full rounded-sm border border-input bg-background px-2 py-1 text-sm text-center text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="w-28">
        <ColorPicker
          value={stage.color}
          onChange={(color) => onUpdate(stage.id, { color })}
        />
      </div>

      <button
        onClick={() => onDelete(stage.id)}
        className="rounded-sm p-1 text-destructive hover:bg-destructive/10 transition-colors"
        title="Delete stage"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StageManager({ companyId, onClose, onSaved }: StageManagerProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const fetchStages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/pipeline-stages`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      setStages(list.sort((a: Stage, b: Stage) => a.sort_order - b.sort_order));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/pipeline-stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName('');
        await fetchStages();
      }
    } catch {
      /* ignore */
    }
  }, [newName, fetchStages]);

  const handleUpdate = useCallback(
    async (id: string, data: Partial<Stage>) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
      );
      try {
        await fetchWithAuth(`${API_URL}/crm/pipeline-stages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch {
        await fetchStages();
      }
    },
    [fetchStages],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setStages((prev) => prev.filter((s) => s.id !== id));
      try {
        await fetchWithAuth(`${API_URL}/crm/pipeline-stages/${id}`, {
          method: 'DELETE',
        });
      } catch {
        await fetchStages();
      }
    },
    [fetchStages],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...stages];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updated = reordered.map((s, i) => ({ ...s, sort_order: i }));
      setStages(updated);

      setSaving(true);
      try {
        await Promise.all(
          updated.map((s) =>
            fetchWithAuth(`${API_URL}/crm/pipeline-stages/${s.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sort_order: s.sort_order }),
            }),
          ),
        );
      } catch {
        await fetchStages();
      } finally {
        setSaving(false);
      }
    },
    [stages, fetchStages],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-2xl rounded-sm bg-card border border-border p-6 shadow-constructivist">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Pipeline Stages</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <div className="w-8" />
          <div className="flex-1">Name</div>
          <div className="w-20 text-center">Prob %</div>
          <div className="w-28">Color</div>
          <div className="w-8" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-sm border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New stage name..."
            className="flex-1 rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="rounded-sm bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110 transition-all"
          >
            Add
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Drag to reorder · Changes save automatically
            {saving && ' Saving...'}
          </p>
          <button
            onClick={() => { onSaved(); onClose(); }}
            className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted-light hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
