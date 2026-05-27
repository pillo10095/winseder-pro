import * as React from "react";

import { cn } from "@/lib/utils";

type AvatarProps = React.ComponentPropsWithoutRef<"span">;
type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  props: AvatarProps,
  ref: React.Ref<HTMLSpanElement>
) {
  const { className, ...rest } = props;
  return (
    <span
      ref={ref}
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full border border-border",
        className
      )}
      {...rest}
    />
  );
});

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(function AvatarImage(
  props: AvatarImageProps,
  ref: React.Ref<HTMLImageElement>
) {
  const { className, ...rest } = props;
  return (
    <img ref={ref} className={cn("size-full object-cover", className)} loading="lazy" {...rest} />
  );
});

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarProps>(function AvatarFallback(
  props: AvatarProps,
  ref: React.Ref<HTMLSpanElement>
) {
  const { className, children, ...rest } = props;
  return (
    <span
      ref={ref}
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        className
      )}
      {...rest}
    >
      {children ?? "WS"}
    </span>
  );
});

export { Avatar, AvatarImage, AvatarFallback };
