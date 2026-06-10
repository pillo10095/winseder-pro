import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  function Separator(props: SeparatorProps, ref: React.Ref<HTMLDivElement>) {
    const { className, orientation = "horizontal", role = "separator", ...rest } = props;
    return (
      <div
        ref={ref}
        role={role}
        data-orientation={orientation}
        className={cn(
          "shrink-0 bg-border",
          orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
          className
        )}
        {...rest}
      />
    );
  }
);

export { Separator };
