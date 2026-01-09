"use client";

import { useState } from "react";
import {
  Plus,
  FileText,
  PanelRightOpen,
  Search,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItem } from "./source-item";
import { AddSourcesDialog } from "./add-sources-dialog";
import { useDocuments } from "@/hooks/use-documents";

interface SourcesPanelProps {
  notebookId: string;
  selectedSources: Set<string>;
  onSelectionChange: (sources: Set<string>) => void;
  autoOpenAddSources?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SourcesPanel({
  notebookId,
  selectedSources,
  onSelectionChange,
  autoOpenAddSources = false,
  collapsed = false,
  onToggleCollapse,
}: SourcesPanelProps) {
  const { data: documents, isLoading } = useDocuments(notebookId);
  const [isUploadOpen, setIsUploadOpen] = useState(autoOpenAddSources);

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold">Sources</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
          title="Collapse panel"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pt-3">
        <Button
          variant="outline"
          onClick={() => setIsUploadOpen(true)}
          className="w-full justify-center gap-1.5 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Add sources
        </Button>
      </div>

      <div className="mx-3 mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-medium text-amber-600">
              Try Deep Research
            </span>{" "}
            for an in-depth report and new sources!
          </p>
        </div>
      </div>

      <div className="mx-3 mt-3 rounded-xl border bg-muted/30 p-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search the web for new sources"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              disabled
              className="flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs"
            >
              <Globe className="h-3 w-3" />
              Web
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              disabled
              className="flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs"
            >
              <Sparkles className="h-3 w-3" />
              Fast Research
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <Button size="icon" disabled className="h-7 w-7 rounded-full">
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {documents && documents.length > 0 && (
        <div className="flex items-center gap-3 border-b px-4 py-3">
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
    </div>
  );
}
