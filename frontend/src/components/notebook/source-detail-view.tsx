"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  useSourceGuide,
  useGenerateSourceGuide,
  useSourceContent,
} from "@/hooks/use-sources";
import { formatFileSize, cn } from "@/lib/utils";
import { useNotebookActions } from "@/stores/notebook-store";
import type { Document, SourceGuide } from "@/types/api";

interface SourceDetailInlineProps {
  document: Document;
  highlightedChunkContent: string | null;
  citationIndex: number | null;
}

export function SourceDetailInline({
  document,
  highlightedChunkContent,
  citationIndex,
}: SourceDetailInlineProps) {
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);

  const { data: guide, isLoading: guideLoading } = useSourceGuide(document.id);
  const { data: content, isLoading: contentLoading } = useSourceContent(
    document.id,
  );
  const generateGuide = useGenerateSourceGuide(document.id);

  const isDocumentReady = document.processing_status === "ready";
  const needsGuide = !guide?.summary && isDocumentReady;
  const isGenerating =
    generateGuide.isPending || (needsGuide && !autoGenerateTriggered);

  useEffect(() => {
    setAutoGenerateTriggered(false);
  }, [document.id]);

  useEffect(() => {
    if (guide?.summary) {
      setGuideExpanded(true);
    }
  }, [guide?.summary]);

  useEffect(() => {
    if (
      !guideLoading &&
      needsGuide &&
      !generateGuide.isPending &&
      !autoGenerateTriggered
    ) {
      setAutoGenerateTriggered(true);
      generateGuide.mutate();
    }
  }, [guideLoading, needsGuide, generateGuide, autoGenerateTriggered]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-4 p-4 pb-0">
        <SourceHeader document={document} />
        <SourceGuideCard
          guide={guide}
          isLoading={guideLoading || isGenerating}
          expanded={guideExpanded}
          onToggle={() => setGuideExpanded(!guideExpanded)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {document.source_type === "youtube" && document.source_url && (
          <YouTubeEmbed url={document.source_url} />
        )}

        <SourceContent
          content={content?.content}
          isLoading={contentLoading}
          highlightText={highlightedChunkContent}
          citationIndex={citationIndex}
        />

        <InfoSection
          document={document}
          expanded={infoExpanded}
          onToggle={() => setInfoExpanded(!infoExpanded)}
        />
      </div>
    </div>
  );
}

function SourceHeader({ document }: { document: Document }) {
  const isYouTube = document.source_type === "youtube";
  const showHostname = document.source_url && !isYouTube;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-on-surface">
        <span className="flex-1 truncate">{document.filename}</span>
        {isYouTube && document.source_url && (
          <a
            href={document.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-primary hover:text-primary-hover"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
      </h2>
      {showHostname && document.source_url && (
        <a
          href={document.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="truncate">{getHostname(document.source_url)}</span>
        </a>
      )}
    </div>
  );
}

function SourceGuideCard({
  guide,
  isLoading,
  expanded,
  onToggle,
}: {
  guide: SourceGuide | undefined;
  isLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasGuide = !!guide?.summary;
  const showContent = expanded && hasGuide && !isLoading;

  return (
    <div className="rounded-xl border border-border bg-surface-variant/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left transition-colors hover:bg-hover"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 font-medium text-on-surface">Source guide</span>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-muted" />
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-on-surface-muted transition-transform",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      {showContent && (
        <div className="max-h-80 overflow-y-auto px-4 pb-4">
          <GuideContent guide={guide} />
        </div>
      )}
    </div>
  );
}

function GuideContent({ guide }: { guide: SourceGuide }) {
  const { askInChat } = useNotebookActions();

  return (
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
              onClick={() => askInChat(`Discuss ${topic}`)}
              className="max-w-[180px] truncate rounded-full border border-border bg-surface px-3 py-1 text-xs text-on-surface-muted transition-colors hover:bg-hover hover:text-on-surface"
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceContent({
  content,
  isLoading,
  highlightText,
  citationIndex,
}: {
  content: string | undefined;
  isLoading: boolean;
  highlightText: string | null;
  citationIndex: number | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <FileText className="mb-3 h-10 w-10 text-on-surface-muted" />
        <p className="font-medium text-on-surface">No content available</p>
      </div>
    );
  }

  return (
    <HighlightedContent
      content={content}
      highlightText={highlightText}
      citationIndex={citationIndex}
    />
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
          <InfoRow label="Chunks" value={String(document.chunk_count)} />
          {document.page_count && (
            <InfoRow label="Pages" value={String(document.page_count)} />
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

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  );
  return match ? match[1] : null;
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

  const match = highlightText ? findTextMatch(content, highlightText) : null;

  if (!match) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-reading text-sm leading-relaxed text-on-surface">
        {content}
      </div>
    );
  }

  const before = content.slice(0, match.index);
  const highlighted = content.slice(match.index, match.index + match.length);
  const after = content.slice(match.index + match.length);

  return (
    <div className="relative whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-reading text-sm leading-relaxed text-on-surface">
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

function findTextMatch(
  content: string,
  searchText: string,
): { index: number; length: number } | null {
  const exactIndex = content.indexOf(searchText);
  if (exactIndex !== -1) {
    return { index: exactIndex, length: searchText.length };
  }

  const normalize = (t: string) => t.replace(/\s+/g, " ").trim();
  const normalizedContent = normalize(content);
  const normalizedSearch = normalize(searchText);
  const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
  if (normalizedIndex !== -1) {
    return { index: normalizedIndex, length: searchText.length };
  }

  const prefix = normalize(searchText.slice(0, 100));
  if (prefix.length >= 20) {
    const prefixIndex = normalizedContent.indexOf(prefix);
    if (prefixIndex !== -1) {
      return {
        index: prefixIndex,
        length: Math.min(searchText.length, 500),
      };
    }
  }

  return null;
}
