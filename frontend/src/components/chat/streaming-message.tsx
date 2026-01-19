"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { MemoizedMarkdown } from "./memoized-markdown";
import { ConfidenceBadge } from "./confidence-badge";
import { RefusalMessage } from "./refusal-message";
import type { SourceInfo, GroundingMetadata } from "@/types/api";

interface StreamingMessageProps {
  content: string;
  sources?: SourceInfo[];
  groundingMetadata?: GroundingMetadata | null;
  onCitationClick?: (index: number) => void;
}

export function StreamingMessage({
  content,
  sources,
  groundingMetadata,
  onCitationClick,
}: StreamingMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lockedMinHeight, setLockedMinHeight] = useState<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const currentHeight = containerRef.current.scrollHeight;
      setLockedMinHeight((prev) =>
        prev === null ? currentHeight : Math.max(prev, currentHeight),
      );
    }
  }, [content]);

  const isRefusal =
    (groundingMetadata && !groundingMetadata.has_relevant_sources) ||
    isRefusalResponse(content);

  if (isRefusal && content.length > 50) {
    return <RefusalMessage content={content} />;
  }

  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div className="max-w-[85%] flex-1">
        <div
          ref={containerRef}
          className="group relative inline-block rounded-2xl px-4 py-3 text-on-surface transition-[min-height] duration-200"
          style={{ minHeight: lockedMinHeight ?? undefined }}
        >
          <div className="prose prose-sm max-w-none">
            <MemoizedMarkdown
              content={content}
              onCitationClick={onCitationClick}
              sources={sources}
            />
          </div>
          {groundingMetadata && groundingMetadata.has_relevant_sources && (
            <div className="mt-2">
              <ConfidenceBadge metadata={groundingMetadata} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isRefusalResponse(content: string): boolean {
  const text = content.slice(0, 300).toLowerCase();
  return (
    text.includes("cannot answer this question based on") ||
    text.includes("don't contain information") ||
    text.includes("documents don't contain") ||
    text.includes("no relevant information")
  );
}
