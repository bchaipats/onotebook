"use client";

import { useState } from "react";
import { Plus, FileStack, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItem } from "./source-item";
import { UploadDialog } from "./upload-dialog";
import { useDocuments } from "@/hooks/use-documents";

interface SourcesPanelProps {
  notebookId: string;
  selectedSources: Set<string>;
  onSelectionChange: (sources: Set<string>) => void;
}

export function SourcesPanel({
  notebookId,
  selectedSources,
  onSelectionChange,
}: SourcesPanelProps) {
  const { data: documents, isLoading } = useDocuments(notebookId);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const readyDocuments = documents?.filter(
    (d) => d.processing_status === "ready"
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

  function selectAll() {
    if (readyDocuments) {
      onSelectionChange(new Set(readyDocuments.map((d) => d.id)));
    }
  }

  function deselectAll() {
    onSelectionChange(new Set());
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <FileStack className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Sources</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setIsUploadOpen(true)}
          className="gap-1.5 rounded-full"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Select All */}
      {documents && documents.length > 0 && (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) =>
              checked ? selectAll() : deselectAll()
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

      {/* Source List */}
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
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No sources yet. Add documents to start chatting.
            </p>
          </div>
        )}
      </div>

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        notebookId={notebookId}
      />
    </div>
  );
}
