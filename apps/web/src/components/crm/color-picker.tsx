'use client';

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A855F7',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-6 w-6 rotate-45 border-2 transition-transform hover:scale-110 ${
            value === color ? 'border-primary scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
