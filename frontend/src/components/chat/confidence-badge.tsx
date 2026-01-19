"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GroundingMetadata } from "@/types/api";

interface ConfidenceBadgeProps {
  metadata: GroundingMetadata;
}

export function ConfidenceBadge({ metadata }: ConfidenceBadgeProps) {
  const { confidence_score, sources_used, avg_relevance, sources_filtered } =
    metadata;

  const isHigh = confidence_score >= 0.6;
  const isMedium = confidence_score >= 0.35;

  const badgeClass = isHigh
    ? "bg-success-muted text-on-success-muted"
    : isMedium
      ? "bg-warning-muted text-on-warning-muted"
      : "bg-destructive-muted text-on-destructive-muted";

  const label = isHigh
    ? "Well grounded"
    : isMedium
      ? "Partially grounded"
      : "Limited sources";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>
          Based on {sources_used} source{sources_used !== 1 ? "s" : ""}
        </p>
        <p>Average relevance: {Math.round(avg_relevance * 100)}%</p>
        {sources_filtered > 0 && (
          <p className="text-on-surface-subtle">
            {sources_filtered} low-relevance source
            {sources_filtered !== 1 ? "s" : ""} filtered
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
