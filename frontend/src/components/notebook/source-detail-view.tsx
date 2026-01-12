"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  FileText,
  Info,
  Loader2,
  Sparkles,
  ExternalLink,
  Globe,
  Youtube,
  StickyNote,
  File,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useSourceGuide,
  useGenerateSourceGuide,
  useSourceContent,
} from "@/hooks/use-sources";
import { cn, formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/api";

interface SourceDetailViewProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightedChunkContent?: string | null;
  citationIndex?: number | null;
}

export function SourceDetailView({
  document,
  open,
  onOpenChange,
  highlightedChunkContent,
  citationIndex,
}: SourceDetailViewProps) {
  // Switch to content tab when there's highlighted content
  const [activeTab, setActiveTab] = useState(
    highlightedChunkContent ? "content" : "guide",
  );

  // Update tab when highlighted content changes
  useEffect(() => {
    if (highlightedChunkContent) {
      setActiveTab("content");
    }
  }, [highlightedChunkContent]);
  const { data: guide, isLoading: guideLoading } = useSourceGuide(
    document?.id ?? null,
  );
  const { data: content, isLoading: contentLoading } = useSourceContent(
    activeTab === "content" ? (document?.id ?? null) : null,
  );
  const generateGuide = useGenerateSourceGuide(document?.id ?? "");

  if (!document) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="shrink-0 pb-4">
          <div className="flex items-center gap-3">
            <SourceTypeIcon sourceType={document.source_type} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-left">
                {document.filename}
              </SheetTitle>
              {document.source_url && (
                <a
                  href={document.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 flex items-center gap-1 text-xs hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">{document.source_url}</span>
                </a>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-0 mt-4 grid w-full shrink-0 grid-cols-3">
            <TabsTrigger value="guide" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Source Guide
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Content
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-4 flex-1 overflow-y-auto">
            {guideLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : guide?.summary ? (
              <div className="prose prose-sm dark:prose-invert">
                <GuideContent content={guide.summary} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="mb-3 h-10 w-10" />
                <p className="font-medium">No source guide yet</p>
                <p className="mt-1 text-sm">
                  Generate an AI summary of this source to help you understand
                  its key concepts.
                </p>
                <Button
                  onClick={() => generateGuide.mutate()}
                  className="mt-4 gap-2"
                  disabled={generateGuide.isPending}
                >
                  {generateGuide.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-on-primary" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Source Guide
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="mt-4 flex-1 overflow-y-auto">
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-3 h-10 w-10" />
                <p className="font-medium">No content available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <InfoRow
                label="Source Type"
                value={formatSourceType(document.source_type)}
              />
              <InfoRow
                label="File Type"
                value={document.file_type.toUpperCase()}
              />
              <InfoRow
                label="Size"
                value={formatFileSize(document.file_size)}
              />
              <InfoRow
                label="Chunks"
                value={`${document.chunk_count} chunks`}
              />
              {document.page_count && (
                <InfoRow label="Pages" value={`${document.page_count} pages`} />
              )}
              {document.source_url && (
                <InfoRow label="Source URL">
                  <a
                    href={document.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    {document.source_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </InfoRow>
              )}
              <InfoRow
                label="Added"
                value={new Date(document.created_at).toLocaleString()}
              />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SourceTypeIcon({ sourceType }: { sourceType: string }) {
  const baseClass = "h-8 w-8 shrink-0 rounded-lg p-1.5";

  switch (sourceType) {
    case "url":
      return (
        <div className={cn(baseClass)}>
          <Globe className="h-full w-full" />
        </div>
      );
    case "youtube":
      return (
        <div className={cn(baseClass)}>
          <Youtube className="h-full w-full" />
        </div>
      );
    case "paste":
      return (
        <div className={cn(baseClass)}>
          <StickyNote className="h-full w-full" />
        </div>
      );
    default:
      return (
        <div className={cn(baseClass)}>
          <File className="h-full w-full" />
        </div>
      );
  }
}

function GuideContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return (
    <p>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-3">
      <span className="text-sm">{label}</span>
      {children || <span className="text-sm font-medium">{value}</span>}
    </div>
  );
}

function formatSourceType(sourceType: string): string {
  switch (sourceType) {
    case "url":
      return "Website";
    case "youtube":
      return "YouTube Video";
    case "paste":
      return "Pasted Text";
    case "file":
      return "Uploaded File";
    default:
      return sourceType;
  }
}

function HighlightedContent({
  content,
  highlightText,
  citationIndex,
}: {
  content: string;
  highlightText?: string | null;
  citationIndex?: number | null;
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
      <div className="whitespace-pre-wrap rounded-lg p-4 font-mono text-sm">
        {content}
      </div>
    );
  }

  const searchText = highlightText;

  // Find highlight using exact match, then normalized match, then prefix match
  function findMatch(): { index: number; length: number } | null {
    // Exact match
    const exactIndex = content.indexOf(searchText);
    if (exactIndex !== -1) {
      return { index: exactIndex, length: searchText.length };
    }

    // Normalized whitespace match
    const normalize = (t: string) => t.replace(/\s+/g, " ").trim();
    const normalizedContent = normalize(content);
    const normalizedSearch = normalize(searchText);
    const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
    if (normalizedIndex !== -1) {
      return { index: normalizedIndex, length: searchText.length };
    }

    // Prefix match (first 100 chars)
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

  const match = findMatch();

  if (!match) {
    return (
      <div className="whitespace-pre-wrap rounded-lg p-4 font-mono text-sm">
        {content}
      </div>
    );
  }

  const before = content.slice(0, match.index);
  const highlighted = content.slice(match.index, match.index + match.length);
  const after = content.slice(match.index + match.length);

  return (
    <div className="relative whitespace-pre-wrap rounded-lg p-4 font-mono text-sm">
      {before}
      <span className="relative inline">
        {citationIndex && (
          <span className="absolute -left-1 -top-5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold">
            {citationIndex}
          </span>
        )}
        <span
          ref={highlightRef}
          className="animate-highlight-pulse rounded px-0.5"
        >
          {highlighted}
        </span>
      </span>
      {after}
    </div>
  );
}
