import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select");
  return ctx;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value: controlledValue, defaultValue, onValueChange, children }: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [isControlled, onValueChange]
  );

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function SelectTrigger({ className, children, ...props }, ref) {
    const { open, setOpen } = useSelectContext();
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-sm border border-input bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 opacity-50" />
      </button>
    );
  }
);

function SelectValue({ className, placeholder, ...props }: React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }) {
  const { value } = useSelectContext();
  return (
    <span className={cn("text-sm", !value && "text-muted-foreground", className)} {...props}>
      {value || placeholder || "Seleccionar..."}
    </span>
  );
}

function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 w-full min-w-[8rem] border border-border bg-popover p-1 shadow-constructivist animate-geo-fade-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function SelectItem({ className, children, value: itemValue, ...props }: SelectItemProps) {
  const { value, onValueChange, setOpen } = useSelectContext();
  const isSelected = value === itemValue;

  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none",
        "hover:bg-primary-muted hover:text-primary cursor-pointer",
        isSelected && "bg-primary-muted text-primary font-medium",
        className
      )}
      onClick={() => {
        onValueChange(itemValue);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
