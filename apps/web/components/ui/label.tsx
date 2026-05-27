import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  function Label(
    props: React.LabelHTMLAttributes<HTMLLabelElement>,
    ref: React.Ref<HTMLLabelElement>
  ) {
    const { className, ...rest } = props;
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...rest}
      />
    );
  }
);

Label.displayName = "Label";

export { Label };
