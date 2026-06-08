'use client';

interface LabelBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
}

export function LabelBadge({ name, color, onRemove }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color + '20', color, borderColor: color, borderWidth: 1 }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
}
