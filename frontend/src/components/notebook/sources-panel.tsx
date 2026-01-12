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
      <div className="flex h-full flex-col items-center gap-2 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-10 w-10 rounded-xl"
          title="Expand sources"
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
        <Button
          variant="fab"
          size="fab-sm"
          onClick={() => setIsUploadOpen(true)}
          title="Add source"
        >
          <Plus className="h-5 w-5" />
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
          <span className="rounded-full bg-surface-variant px-2.5 py-1 text-xs font-medium text-on-surface-muted">
            {sourceCount.count}/{sourceCount.limit}
          </span>
        )}
      </PanelHeader>

      <div className="px-4 pt-4">
        <Button
          variant="tonal"
          onClick={() => setIsUploadOpen(true)}
          disabled={isAtLimit}
          className="w-full justify-center gap-2 rounded-full py-5 font-medium"
        >
          <Plus className="h-5 w-5" />
          {isAtLimit ? "Source limit reached" : "Add sources"}
        </Button>
      </div>

      <div className="mx-4 mt-4 overflow-hidden rounded-2xl bg-surface-variant p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-muted">
            <Sparkles className="h-4 w-4 text-on-primary-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-on-surface">
              Deep Research
            </p>
            <p className="mt-0.5 text-xs text-on-surface-muted">
              Get an in-depth report and discover new sources
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4">
        <SourceSearch notebookId={notebookId} />
      </div>

      {documents && documents.length > 0 && (
        <div className="mt-3 flex items-center gap-3 px-4 pb-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) =>
              checked
                ? onSelectionChange(new Set(readyDocuments?.map((d) => d.id)))
                : onSelectionChange(new Set())
            }
            className="rounded-md"
          />
          <span className="text-sm text-on-surface">
            Select all sources
            <span className="ml-2 rounded-full bg-surface-variant px-2 py-0.5 text-xs font-medium text-on-surface-muted">
              {selectedSources.size}/{readyDocuments?.length || 0}
            </span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-surface-variant"
              />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <SourceItem
                key={doc.id}
                document={doc}
                isSelected={selectedSources.has(doc.id)}
                onToggle={() => toggleSource(doc.id)}
                onPreview={() => handleManualPreview(doc)}
                className={`animate-spring-in-up stagger-${Math.min(index + 1, 8)}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-variant">
              <FileText className="h-8 w-8 text-on-surface-muted" />
            </div>
            <p className="font-heading text-base font-semibold text-on-surface">
              No sources yet
            </p>
            <p className="mt-2 max-w-[200px] text-sm text-on-surface-muted">
              Add PDFs, websites, text, videos, or audio files to get started
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
      <div className="flex items-center gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
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
              <span className="truncate">{document.source_url}</span>
            </a>
          )}
        </div>
      </div>

      <div className="px-4 py-2">
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
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : guide?.summary ? (
              <div className="prose prose-sm">
                <p>{guide.summary}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-on-surface-muted" />
                <p className="font-medium text-on-surface">
                  No source guide yet
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
                <FileText className="mb-3 h-10 w-10 text-on-surface-muted" />
                <p className="font-medium text-on-surface">
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
    <div className="flex items-center justify-between border-b border-divider pb-2 text-sm">
      <span className="text-on-surface-muted">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
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
      <div className="whitespace-pre-wrap rounded-lg bg-surface-variant p-4 font-mono text-sm text-on-surface">
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
