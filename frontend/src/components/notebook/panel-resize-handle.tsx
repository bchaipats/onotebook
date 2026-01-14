"use client";

import { Separator } from "react-resizable-panels";

export function ResizeHandle() {
  return (
    <Separator className="group relative flex w-3 shrink-0 items-center justify-center transition-colors duration-150 hover:bg-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="h-8 w-1 rounded-full bg-border opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:bg-primary group-active:opacity-100" />
    </Separator>
  );
}
