"use client";

import { Bot } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-variant px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite] rounded-full bg-on-surface-muted" />
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite_0.2s] rounded-full bg-on-surface-muted" />
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite_0.4s] rounded-full bg-on-surface-muted" />
        </div>
        <span className="text-sm text-on-surface-muted">
          Searching your sources...
        </span>
      </div>
    </div>
  );
}
