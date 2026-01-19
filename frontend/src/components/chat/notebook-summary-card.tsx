"use client";

import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotebookSummary } from "@/types/api";

interface NotebookSummaryCardProps {
  summary: NotebookSummary;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function NotebookSummaryCard({
  summary,
  onRegenerate,
  isRegenerating,
}: NotebookSummaryCardProps) {
  return (
    <div className="mb-6 rounded-lg bg-surface-variant p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-on-surface">Notebook Summary</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="h-8 text-xs"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin text-on-surface-muted" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 h-3 w-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>
      <div className="prose prose-sm max-w-none">
        <p>
          {highlightKeyTerms(summary.summary || "", summary.key_terms || [])}
        </p>
      </div>
      {summary.key_terms && summary.key_terms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.key_terms.map((term) => (
            <span
              key={term}
              className="rounded-full bg-primary-muted px-3 py-1 text-xs font-medium text-on-primary-muted"
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function highlightKeyTerms(text: string, keyTerms: string[]): React.ReactNode {
  if (!keyTerms.length) return text;

  const sortedTerms = [...keyTerms].sort((a, b) => b.length - a.length);
  const escapedTerms = sortedTerms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");

  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const isKeyTerm = keyTerms.some(
      (term) => term.toLowerCase() === part.toLowerCase(),
    );
    return isKeyTerm ? <strong key={i}>{part}</strong> : part;
  });
}
