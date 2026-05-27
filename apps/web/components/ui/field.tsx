import * as React from "react";

import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;

const FieldGroup = React.forwardRef<HTMLDivElement, DivProps>(function FieldGroup(
  props: DivProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { className, ...rest } = props;
  return <div ref={ref} className={cn("flex flex-col gap-4", className)} {...rest} />;
});

const Field = React.forwardRef<HTMLDivElement, DivProps>(function Field(
  props: DivProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5", className)}
      data-slot="field"
      {...rest}
    />
  );
});

const FieldLabel = React.forwardRef<HTMLLabelElement, LabelProps>(function FieldLabel(
  props: LabelProps,
  ref: React.Ref<HTMLLabelElement>
) {
  const { className, ...rest } = props;
  return (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-foreground", className)}
      {...rest}
    />
  );
});

const FieldControl = React.forwardRef<HTMLDivElement, DivProps>(function FieldControl(
  props: DivProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { className, ...rest } = props;
  return <div ref={ref} className={cn("flex items-center gap-2", className)} {...rest} />;
});

const FieldDescription = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  function FieldDescription(props: ParagraphProps, ref: React.Ref<HTMLParagraphElement>) {
    const { className, ...rest } = props;
    return (
      <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...rest} />
    );
  }
);

const FieldMessage = React.forwardRef<HTMLParagraphElement, ParagraphProps>(function FieldMessage(
  props: ParagraphProps,
  ref: React.Ref<HTMLParagraphElement>
) {
  const { className, ...rest } = props;
  return (
    <p ref={ref} className={cn("text-xs font-medium text-destructive", className)} {...rest} />
  );
});

export { FieldGroup, Field, FieldControl, FieldDescription, FieldLabel, FieldMessage };
