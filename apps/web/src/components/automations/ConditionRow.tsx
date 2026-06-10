"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  FIELD_OPTIONS,
  OPERATOR_OPTIONS,
  type Condition,
} from "./constants";

interface ConditionRowProps {
  condition: Condition;
  index: number;
  isRemovable: boolean;
  onUpdate: (i: number, field: keyof Condition, value: string) => void;
  onRemove: (i: number) => void;
}

export const ConditionRow = memo(function ConditionRow({
  condition,
  index,
  isRemovable,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      <div className="flex flex-1 flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Campo</Label>
          <select
            value={condition.field}
            onChange={(e) => onUpdate(index, "field", e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {FIELD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Operador</Label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate(index, "operator", e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {OPERATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <Label className="text-xs">Valor</Label>
          <Input
            value={condition.value}
            onChange={(e) => onUpdate(index, "value", e.target.value)}
            placeholder='Ej: "precio", "hola", "^venta$"'
          />
        </div>
      </div>
      {isRemovable && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-5"
          onClick={() => onRemove(index)}
        >
          ✕
        </Button>
      )}
    </div>
  );
});
