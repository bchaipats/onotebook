import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-base text-on-surface placeholder:text-on-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-on-surface disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
