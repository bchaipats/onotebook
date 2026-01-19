import React from "react";
import type { SourceInfo } from "@/types/api";

export interface ProcessTextWithCitationsOptions {
  text: string;
  sources?: SourceInfo[];
  maxCitations?: number;
  showAllCitations?: boolean;
  onShowMore?: () => void;
  renderCitation: (
    index: number,
    source: SourceInfo | undefined,
    key: string,
  ) => React.ReactNode;
  renderShowMore?: (count: number) => React.ReactNode;
}

export function processTextWithCitations({
  text,
  sources,
  maxCitations = 3,
  showAllCitations = false,
  onShowMore,
  renderCitation,
  renderShowMore,
}: ProcessTextWithCitationsOptions): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;
  let citationCount = 0;

  // First pass: count all citations
  const allMatches: Array<{ index: number; matchIndex: number }> = [];
  while ((match = citationRegex.exec(text)) !== null) {
    allMatches.push({
      index: parseInt(match[1], 10),
      matchIndex: match.index,
    });
  }

  // Second pass: build parts with potential truncation
  citationRegex.lastIndex = 0;
  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citationIndex = parseInt(match[1], 10);
    const source = sources?.find((s) => s.citation_index === citationIndex);

    citationCount++;
    const shouldShow = showAllCitations || citationCount <= maxCitations;

    if (shouldShow) {
      parts.push(
        renderCitation(citationIndex, source, `citation-${match.index}`),
      );
    } else if (
      citationCount === maxCitations + 1 &&
      onShowMore &&
      renderShowMore
    ) {
      parts.push(renderShowMore(allMatches.length - maxCitations));
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export interface ProcessChildrenOptions {
  children: React.ReactNode;
  sources?: SourceInfo[];
  showAllCitations?: boolean;
  onShowMore?: () => void;
  renderCitation: (
    index: number,
    source: SourceInfo | undefined,
    key: string,
  ) => React.ReactNode;
  renderShowMore?: (count: number) => React.ReactNode;
}

export function processChildren({
  children,
  sources,
  showAllCitations,
  onShowMore,
  renderCitation,
  renderShowMore,
}: ProcessChildrenOptions): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child !== "string") return child;

    const processed = processTextWithCitations({
      text: child,
      sources,
      showAllCitations,
      onShowMore,
      renderCitation,
      renderShowMore,
    });

    return processed.length === 1 && typeof processed[0] === "string" ? (
      child
    ) : (
      <React.Fragment key={idx}>{processed}</React.Fragment>
    );
  });
}
