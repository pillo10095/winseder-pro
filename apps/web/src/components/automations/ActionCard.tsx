"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ACTION_TYPE_OPTIONS,
  actionConfigFields,
  type Action,
} from "./constants";

interface ActionCardProps {
  action: Action;
  index: number;
  isRemovable: boolean;
  onUpdateConfig: (i: number, key: string, value: string) => void;
  onChangeType: (i: number, type: Action["type"]) => void;
  onRemove: (i: number) => void;
}

export const ActionCard = memo(function ActionCard({
  action,
  index,
  isRemovable,
  onUpdateConfig,
  onChangeType,
  onRemove,
}: ActionCardProps) {
  const fields = actionConfigFields(action);

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-start justify-between">
        <select
          value={action.type}
          onChange={(e) => onChangeType(index, e.target.value as Action["type"])}
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {ACTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {isRemovable && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(index)}
          >
            ✕
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            {action.type === "ai_classify"
              ? "Clasifica el mensaje automáticamente: compra, soporte, reclamo, consulta."
              : action.type === "ai_hot_lead"
                ? "Analiza automáticamente si el mensaje tiene intención de compra."
                : ""}
          </p>
        ) : (
          fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label className="text-xs">{field.label}</Label>
              <Input
                value={action.config[field.key] ?? ""}
                onChange={(e) => onUpdateConfig(index, field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
