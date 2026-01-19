"use client";

import { Bot, Search, BookOpen, Sparkles } from "lucide-react";
import type { StreamingStage } from "@/types/api";

const STAGE_CONFIG: Record<
  StreamingStage,
  { message: string; icon: typeof Search }
> = {
  searching: { message: "Searching sources...", icon: Search },
  reading: { message: "Reading documents...", icon: BookOpen },
  generating: { message: "Generating response...", icon: Sparkles },
};

interface ThinkingIndicatorProps {
  stage?: StreamingStage | null;
}

export function ThinkingIndicator({ stage }: ThinkingIndicatorProps) {
  const config = stage ? STAGE_CONFIG[stage] : STAGE_CONFIG.searching;
  const StageIcon = config.icon;

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
        <div className="flex items-center gap-2">
          <StageIcon className="h-3.5 w-3.5 text-on-surface-muted" />
          <span className="text-sm text-on-surface-muted">
            {config.message}
          </span>
        </div>
      </div>
    </div>
  );
}
