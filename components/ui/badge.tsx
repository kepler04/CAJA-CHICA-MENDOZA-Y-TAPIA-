import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
        success:
          "bg-success/12 text-success ring-1 ring-inset ring-success/25",
        destructive:
          "bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25",
        muted:
          "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
        outline: "text-foreground ring-1 ring-inset ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
