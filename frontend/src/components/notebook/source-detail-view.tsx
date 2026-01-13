"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSourceGuide,
  useGenerateSourceGuide,
  useSourceContent,
} from "@/hooks/use-sources";
import { formatFileSize, cn } from "@/lib/utils";
import { useChatActions } from "@/stores/chat-actions";
import type { Document, SourceGuide } from "@/types/api";

interface SourceDetailInlineProps {
  document: Document;
  highlightedChunkContent: string | null;
  citationIndex: number | null;
  onBack: () => void;
}

export function SourceDetailInline({
  document,
  highlightedChunkContent,
  citationIndex,
  onBack,
}: SourceDetailInlineProps) {
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const { data: guide, isLoading: guideLoading } = useSourceGuide(document.id);
  const { data: content, isLoading: contentLoading } = useSourceContent(
    document.id,
  );
  const generateGuide = useGenerateSourceGuide(document.id);

  useEffect(() => {
    if (guide?.summary) {
      setGuideExpanded(true);
    }
  }, [guide?.summary]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-divider px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-on-surface">
            {document.filename}
          </h2>
          {document.source_url && (
            <a
              href={document.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">
                {getHostname(document.source_url)}
              </span>
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <SourceGuideCard
          guide={guide}
          isLoading={guideLoading}
          expanded={guideExpanded}
          onToggle={() => setGuideExpanded(!guideExpanded)}
          onGenerate={() => generateGuide.mutate()}
          isGenerating={generateGuide.isPending}
        />

        {document.source_type === "youtube" && document.source_url && (
          <YouTubeEmbed url={document.source_url} />
        )}

        {contentLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : content?.content ? (
          <HighlightedContent
            content={content.content}
            highlightText={highlightedChunkContent}
            citationIndex={citationIndex}
          />
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <FileText className="mb-3 h-10 w-10 text-on-surface-muted" />
            <p className="font-medium text-on-surface">No content available</p>
          </div>
        )}

        <InfoSection
          document={document}
          expanded={infoExpanded}
          onToggle={() => setInfoExpanded(!infoExpanded)}
        />
      </div>
    </>
  );
}

function SourceGuideCard({
  guide,
  isLoading,
  expanded,
  onToggle,
  onGenerate,
  isGenerating,
}: {
  guide: SourceGuide | undefined;
  isLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const hasGuide = !!guide?.summary;
  const isClickable = hasGuide || isLoading;

  return (
    <div className="rounded-xl border border-border bg-surface-variant/50">
      <button
        onClick={isClickable ? onToggle : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left transition-colors",
          isClickable && "hover:bg-hover",
          !isClickable && "cursor-default",
        )}
        disabled={!isClickable}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 font-medium text-on-surface">Source guide</span>
        {isClickable && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-on-surface-muted transition-transform",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : hasGuide ? (
            <div className="space-y-3">
              <p className="prose prose-sm text-on-surface">
                {guide
                  .summary!.split(/(\*\*[^*]+\*\*)/g)
                  .map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
              </p>
              {guide.topics && guide.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {guide.topics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        useChatActions
                          .getState()
                          .setPendingMessage(`Discuss ${topic}`)
                      }
                      className="max-w-[180px] truncate rounded-full border border-border bg-surface px-3 py-1 text-xs text-on-surface-muted transition-colors hover:bg-hover hover:text-on-surface"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <p className="mb-3 text-sm text-on-surface-muted">
                Generate an AI summary of this source
              </p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate();
                }}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Guide
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface-variant">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  );
  return match ? match[1] : null;
}

function InfoSection({
  document,
  expanded,
  onToggle,
}: {
  document: Document;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left transition-colors hover:bg-hover"
      >
        <Info className="h-4 w-4 shrink-0 text-on-surface-muted" />
        <span className="flex-1 text-sm font-medium text-on-surface">
          Source info
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-on-surface-muted transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          <InfoRow
            label="Type"
            value={
              SOURCE_TYPE_LABELS[document.source_type] ?? document.source_type
            }
          />
          <InfoRow label="Size" value={formatFileSize(document.file_size)} />
          <InfoRow label="Chunks" value={`${document.chunk_count}`} />
          {document.page_count && (
            <InfoRow label="Pages" value={`${document.page_count}`} />
          )}
          <InfoRow
            label="Added"
            value={new Date(document.created_at).toLocaleDateString()}
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-on-surface-muted">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
    </div>
  );
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  url: "Website",
  youtube: "YouTube Video",
  paste: "Pasted Text",
  file: "Uploaded File",
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function HighlightedContent({
  content,
  highlightText,
  citationIndex,
}: {
  content: string;
  highlightText: string | null;
  citationIndex: number | null;
}) {
  const highlightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (highlightRef.current && highlightText) {
      const timer = setTimeout(() => {
        highlightRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightText]);

  if (!highlightText) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-mono text-sm text-on-surface">
        {content}
      </div>
    );
  }

  function findMatch(): { index: number; length: number } | null {
    const exactIndex = content.indexOf(highlightText);
    if (exactIndex !== -1) {
      return { index: exactIndex, length: highlightText.length };
    }

    const normalize = (t: string) => t.replace(/\s+/g, " ").trim();
    const normalizedContent = normalize(content);
    const normalizedSearch = normalize(highlightText);
    const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
    if (normalizedIndex !== -1) {
      return { index: normalizedIndex, length: highlightText.length };
    }

    const prefix = normalize(highlightText.slice(0, 100));
    if (prefix.length >= 20) {
      const prefixIndex = normalizedContent.indexOf(prefix);
      if (prefixIndex !== -1) {
        return {
          index: prefixIndex,
          length: Math.min(highlightText.length, 500),
        };
      }
    }

    return null;
  }

  const match = findMatch();

  if (!match) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-mono text-sm text-on-surface">
        {content}
      </div>
    );
  }

  const before = content.slice(0, match.index);
  const highlighted = content.slice(match.index, match.index + match.length);
  const after = content.slice(match.index + match.length);

  return (
    <div className="relative whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-mono text-sm text-on-surface">
      {before}
      <span className="relative inline">
        {citationIndex && (
          <span className="absolute -left-1 -top-5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
            {citationIndex}
          </span>
        )}
        <span
          ref={highlightRef}
          className="animate-highlight-pulse rounded bg-warning-muted px-0.5"
        >
          {highlighted}
        </span>
      </span>
      {after}
    </div>
  );
}
