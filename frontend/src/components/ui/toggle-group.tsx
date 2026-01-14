"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleGroupVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      default: "rounded-lg bg-surface-variant p-1",
      pill: "h-12 gap-1 rounded-[var(--radius-pill)] bg-surface-variant p-1",
      outline: "rounded-[var(--radius-pill)] border border-border p-1",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-md px-3 py-1.5 text-on-surface-muted data-[state=on]:bg-surface data-[state=on]:text-on-surface data-[state=on]:shadow-elevation-1",
        pill: "h-[var(--h-button-lg)] rounded-[var(--radius-pill-inner)] px-4 text-on-surface-muted data-[state=on]:bg-surface data-[state=on]:text-on-surface data-[state=on]:shadow-elevation-1",
        outline:
          "h-8 gap-1.5 rounded-[var(--radius-pill)] px-3 text-on-surface-muted data-[state=on]:bg-primary data-[state=on]:text-on-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ToggleGroupContextValue = VariantProps<typeof toggleGroupVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  variant: "default",
});

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleGroupVariants>;

function ToggleGroup({
  className,
  variant,
  children,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(toggleGroupVariants({ variant, className }))}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

interface ToggleGroupItemProps
  extends
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    Omit<VariantProps<typeof toggleGroupItemVariants>, "variant"> {}

function ToggleGroupItem({
  className,
  children,
  ...props
}: ToggleGroupItemProps) {
  const { variant } = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      className={cn(toggleGroupItemVariants({ variant, className }))}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
