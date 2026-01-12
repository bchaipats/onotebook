import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary shadow-elevation-1 hover:bg-primary-hover active:bg-primary-active",
        filled:
          "bg-primary text-on-primary shadow-elevation-1 hover:bg-primary-hover active:bg-primary-active",
        tonal:
          "bg-primary-muted text-on-primary-muted hover:bg-primary-muted/80 active:bg-primary-muted/70",
        elevated:
          "bg-surface text-on-surface shadow-elevation-2 hover:shadow-elevation-3 hover:bg-hover active:bg-active",
        outline:
          "border border-border bg-transparent text-on-surface hover:bg-hover active:bg-active",
        secondary:
          "bg-secondary text-on-secondary hover:bg-secondary-hover active:bg-secondary-active",
        ghost: "text-on-surface hover:bg-hover active:bg-active",
        link: "text-primary underline-offset-4 hover:underline",
        tertiary:
          "text-primary hover:bg-primary-muted/50 active:bg-primary-muted",
        "tertiary-tonal":
          "text-on-primary-muted bg-primary-muted/30 hover:bg-primary-muted/50 active:bg-primary-muted",
        destructive:
          "bg-destructive text-on-destructive shadow-elevation-1 hover:bg-destructive-hover",
        error:
          "bg-destructive text-on-destructive shadow-elevation-1 hover:bg-destructive-hover",
        "error-tonal":
          "bg-destructive-muted text-on-destructive-muted hover:bg-destructive-muted/80",
        fab: "bg-primary text-on-primary shadow-elevation-3 hover:shadow-elevation-4",
        "fab-secondary":
          "bg-secondary text-on-secondary shadow-elevation-3 hover:shadow-elevation-4",
        "fab-tertiary":
          "bg-surface text-primary shadow-elevation-3 hover:shadow-elevation-4",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        xl: "h-12 rounded-xl px-8 text-base",
        pill: "h-[var(--h-button-lg)] rounded-[var(--radius-pill)] px-6",
        icon: "h-9 w-9 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-10 w-10 rounded-xl",
        fab: "h-14 w-14 rounded-2xl",
        "fab-sm": "h-10 w-10 rounded-xl",
        "fab-extended": "h-14 rounded-2xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
