"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, PanelRightOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItem } from "./source-item";
import { AddSourcesDialog } from "./add-sources-dialog";
import { SourceDetailInline } from "./source-detail-view";
import { SourceSearch } from "./source-search";
import { PanelHeader } from "./panel-header";
import { useDocuments } from "@/hooks/use-documents";
import { useSourceCount } from "@/hooks/use-sources";
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
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [highlightedChunkContent, setHighlightedChunkContent] = useState<
    string | null
  >(null);
  const [citationIndex, setCitationIndex] = useState<number | null>(null);

  useEffect(() => {
    if (highlightedCitation && documents) {
      const doc = documents.find(
        (d) => d.id === highlightedCitation.documentId,
      );
      if (doc) {
        setSelectedDocument(doc);
        setHighlightedChunkContent(highlightedCitation.chunkContent);
        setCitationIndex(highlightedCitation.citationIndex);
      }
    }
  }, [highlightedCitation, documents]);

  function clearSelection() {
    setSelectedDocument(null);
    setHighlightedChunkContent(null);
    setCitationIndex(null);
  }

  function handleSourceClick(doc: Document) {
    setSelectedDocument(doc);
    setHighlightedChunkContent(null);
    setCitationIndex(null);
  }

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
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-divider">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onToggleCollapse}
            className="[&_svg]:size-5"
            title="Expand sources"
          >
            <PanelRightOpen />
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center py-4">
          <Button
            variant="fab"
            size="fab-sm"
            onClick={() => setIsUploadOpen(true)}
            title="Add source"
          >
            <Plus />
          </Button>
        </div>
        <AddSourcesDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          notebookId={notebookId}
        />
      </div>
    );
  }

  if (selectedDocument) {
    return (
      <div className="flex h-full flex-col">
        <SourceDetailInline
          document={selectedDocument}
          highlightedChunkContent={highlightedChunkContent}
          citationIndex={citationIndex}
          onBack={clearSelection}
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
      />

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

      <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-success-muted px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-on-success-muted" />
        <p className="text-sm">
          <button className="font-medium text-primary hover:underline">
            Try Deep Research
          </button>
          <span className="text-on-surface-muted">
            {" "}
            for an in-depth report and new sources!
          </span>
        </p>
      </div>

      <div className="mx-4 mt-4">
        <SourceSearch notebookId={notebookId} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {documents && documents.length > 0 && (
          <div className="mb-2 flex items-center justify-between px-2 py-2">
            <span className="text-sm text-on-surface">Select all sources</span>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) =>
                checked
                  ? onSelectionChange(new Set(readyDocuments?.map((d) => d.id)))
                  : onSelectionChange(new Set())
              }
            />
          </div>
        )}
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
                onClick={() => handleSourceClick(doc)}
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
    </div>
  );
}
