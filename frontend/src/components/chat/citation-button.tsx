"use client";

import { memo } from "react";
import { FileText } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { SourceInfo } from "@/types/api";

interface CitationButtonProps {
  index: number;
  source?: SourceInfo;
  onClick: (index: number) => void;
}

export const CitationButton = memo(function CitationButton({
  index,
  source,
  onClick,
}: CitationButtonProps) {
  const button = (
    <button
      onClick={() => onClick(index)}
      className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-muted px-2 text-xs font-semibold text-on-primary-muted shadow-sm transition-colors duration-150 hover:bg-primary-muted/80"
    >
      {index}
    </button>
  );

  if (!source) return button;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{button}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="w-80 rounded-xl border border-outline-variant bg-surface p-0 shadow-elevation-2"
      >
        <div className="border-b border-outline-variant px-3 py-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-on-surface-muted" />
            <span className="truncate text-sm font-medium text-on-surface">
              {source.document_name}
            </span>
          </div>
        </div>
        <div className="px-3 py-2">
          <p className="line-clamp-4 text-xs leading-relaxed text-on-surface-muted">
            {source.content}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant px-3 py-2">
          <span className="text-xs text-on-surface-subtle">
            Relevance: {Math.round(source.relevance_score * 100)}%
          </span>
          <span className="text-xs text-primary">Click to view in source</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

interface ShowMoreCitationsButtonProps {
  count: number;
  onClick: () => void;
}

export function ShowMoreCitationsButton({
  count,
  onClick,
}: ShowMoreCitationsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="mx-0.5 inline-flex h-5 items-center justify-center rounded-full bg-surface-variant px-2 text-xs font-medium text-on-surface-muted transition-colors hover:bg-hover"
    >
      +{count} more
    </button>
  );
}
