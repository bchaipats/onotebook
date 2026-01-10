"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  FileText,
  PanelRightOpen,
  Sparkles,
  ChevronLeft,
  BookOpen,
  Info,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SourceItem } from "./source-item";
import { AddSourcesDialog } from "./add-sources-dialog";
import { SourceDetailView } from "./source-detail-view";
import { SourceSearch } from "./source-search";
import { PanelHeader } from "./panel-header";
import { useDocuments } from "@/hooks/use-documents";
import {
  useSourceCount,
  useSourceGuide,
  useGenerateSourceGuide,
  useSourceContent,
} from "@/hooks/use-sources";
import { formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/api";
import type { HighlightedCitation } from "./chat-panel";

interface SourcesPanelProps {
  notebookId: string;
  selectedSources: Set<string>;
  onSelectionChange: (sources: Set<string>) => void;
  autoOpenAddSources?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  highlightedCitation?: HighlightedCitation | null;
}

export function SourcesPanel({
  notebookId,
  selectedSources,
  onSelectionChange,
  autoOpenAddSources = false,
  collapsed = false,
  onToggleCollapse,
  highlightedCitation,
}: SourcesPanelProps) {
  const { data: documents, isLoading } = useDocuments(notebookId);
  const { data: sourceCount } = useSourceCount(notebookId);
  const [isUploadOpen, setIsUploadOpen] = useState(autoOpenAddSources);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [highlightedChunkContent, setHighlightedChunkContent] = useState<
    string | null
  >(null);
  const [citationIndex, setCitationIndex] = useState<number | null>(null);
  const [showInlineDetail, setShowInlineDetail] = useState(false);

  useEffect(() => {
    if (highlightedCitation && documents) {
      const doc = documents.find(
        (d) => d.id === highlightedCitation.documentId,
      );
      if (doc) {
        setPreviewDocument(doc);
        setHighlightedChunkContent(highlightedCitation.chunkContent);
        setCitationIndex(highlightedCitation.citationIndex);
        setShowInlineDetail(true);
      }
    }
  }, [highlightedCitation, documents]);

  const handleManualPreview = (doc: Document) => {
    setPreviewDocument(doc);
    setHighlightedChunkContent(null);
    setCitationIndex(null);
    setShowInlineDetail(false);
  };

  const clearPreview = () => {
    setPreviewDocument(null);
    setHighlightedChunkContent(null);
    setCitationIndex(null);
    setShowInlineDetail(false);
  };

  const isAtLimit = sourceCount ? sourceCount.remaining <= 0 : false;

  const readyDocuments = documents?.filter(
    (d) => d.processing_status === "ready",
  );
  const allSelected =
    readyDocuments &&
    readyDocuments.length > 0 &&
    readyDocuments.every((d) => selectedSources.has(d.id));

  function toggleSource(id: string) {
    const newSelection = new Set(selectedSources);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-1 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-9 w-9"
          title="Expand sources"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsUploadOpen(true)}
          className="h-9 w-9"
          title="Add source"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (showInlineDetail && previewDocument) {
    return (
      <div className="flex h-full flex-col">
        <InlineSourceDetail
          document={previewDocument}
          highlightedChunkContent={highlightedChunkContent}
          citationIndex={citationIndex}
          onClose={clearPreview}
        />
        <AddSourcesDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          notebookId={notebookId}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Sources"
        collapseIcon={<PanelRightOpen />}
        onToggleCollapse={onToggleCollapse}
      >
        {sourceCount && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {sourceCount.count}/{sourceCount.limit}
          </span>
        )}
      </PanelHeader>

      <div className="px-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setIsUploadOpen(true)}
          disabled={isAtLimit}
          className="w-full justify-center gap-1.5 rounded-full"
        >
          <Plus className="h-4 w-4" />
          {isAtLimit ? "Source limit reached" : "Add sources"}
        </Button>
      </div>

      <div className="mx-3 mt-4 rounded-lg bg-violet-50 p-3 dark:bg-violet-950/30">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
          <p className="text-xs text-violet-800 dark:text-violet-200">
            <span className="font-medium text-violet-600">
              Try Deep Research
            </span>{" "}
            for an in-depth report and new sources!
          </p>
        </div>
      </div>

      <div className="mx-3 mt-4">
        <SourceSearch notebookId={notebookId} />
      </div>

      {documents && documents.length > 0 && (
        <div className="mt-2 flex items-center gap-3 border-b px-4 py-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) =>
              checked
                ? onSelectionChange(new Set(readyDocuments?.map((d) => d.id)))
                : onSelectionChange(new Set())
            }
            className="rounded"
          />
          <span className="text-sm text-muted-foreground">
            Select all sources
            <span className="ml-1 text-xs">
              ({selectedSources.size}/{readyDocuments?.length || 0})
            </span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          documents.map((doc, index) => (
            <SourceItem
              key={doc.id}
              document={doc}
              isSelected={selectedSources.has(doc.id)}
              onToggle={() => toggleSource(doc.id)}
              onPreview={() => handleManualPreview(doc)}
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              Saved sources will appear here
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Click Add source above to add PDFs, websites, text, videos, or
              audio files.
            </p>
          </div>
        )}
      </div>

      <AddSourcesDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        notebookId={notebookId}
      />

      <SourceDetailView
        document={previewDocument}
        open={!!previewDocument && !showInlineDetail}
        onOpenChange={(open) => !open && clearPreview()}
        highlightedChunkContent={highlightedChunkContent}
        citationIndex={citationIndex}
      />
    </div>
  );
}

function InlineSourceDetail({
  document,
  highlightedChunkContent,
  citationIndex,
  onClose,
}: {
  document: Document;
  highlightedChunkContent: string | null;
  citationIndex: number | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState(
    highlightedChunkContent ? "content" : "guide",
  );
  const { data: guide, isLoading: guideLoading } = useSourceGuide(document.id);
  const { data: content, isLoading: contentLoading } = useSourceContent(
    activeTab === "content" ? document.id : null,
  );
  const generateGuide = useGenerateSourceGuide(document.id);

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{document.filename}</h2>
          {document.source_url && (
            <a
              href={document.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{document.source_url}</span>
            </a>
          )}
        </div>
      </div>

      <div className="border-b px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide" className="gap-1 text-xs">
              <BookOpen className="h-3 w-3" />
              Source Guide
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Content
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1 text-xs">
              <Info className="h-3 w-3" />
              Info
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "guide" && (
          <>
            {guideLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : guide?.summary ? (
              <div className="prose prose-sm dark:prose-invert">
                <p>{guide.summary}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">
                  No source guide yet
                </p>
                <Button
                  onClick={() => generateGuide.mutate()}
                  className="mt-4 gap-2"
                  disabled={generateGuide.isPending}
                >
                  {generateGuide.isPending ? (
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
          </>
        )}

        {activeTab === "content" && (
          <>
            {contentLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : content?.content ? (
              <HighlightedContent
                content={content.content}
                highlightText={highlightedChunkContent}
                citationIndex={citationIndex}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">
                  No content available
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "info" && (
          <div className="space-y-3">
            <InfoRow label="Source Type" value={document.source_type} />
            <InfoRow
              label="File Type"
              value={document.file_type.toUpperCase()}
            />
            <InfoRow label="Size" value={formatFileSize(document.file_size)} />
            <InfoRow label="Chunks" value={`${document.chunk_count} chunks`} />
            {document.page_count && (
              <InfoRow label="Pages" value={`${document.page_count} pages`} />
            )}
            <InfoRow
              label="Added"
              value={new Date(document.created_at).toLocaleString()}
            />
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function HighlightedContent({
  content,
  highlightText,
  citationIndex,
}: {
  content: string;
  highlightText: string | null;
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
      <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm">
        {content}
      </div>
    );
  }

  const searchText = highlightText;

  // Find highlight using exact match, then normalized match, then prefix match
  function findMatch(): { index: number; length: number } | null {
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

  const match = findMatch();

  if (!match) {
    return (
      <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm">
        {content}
      </div>
    );
  }

  const before = content.slice(0, match.index);
  const highlighted = content.slice(match.index, match.index + match.length);
  const after = content.slice(match.index + match.length);

  return (
    <div className="relative whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm">
      {before}
      <span className="relative inline">
        {citationIndex && (
          <span className="absolute -left-1 -top-5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            {citationIndex}
          </span>
        )}
        <span
          ref={highlightRef}
          className="animate-highlight-pulse rounded bg-violet-200 px-0.5 ring-2 ring-violet-400 dark:bg-violet-900/70 dark:ring-violet-500"
        >
          {highlighted}
        </span>
      </span>
      {after}
    </div>
  );
}
