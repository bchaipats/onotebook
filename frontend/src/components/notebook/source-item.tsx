"use client";

import { useState } from "react";
import {
  FileText,
  FileType,
  FileCode,
  File,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useDeleteDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/api";

interface SourceItemProps {
  document: Document;
  isSelected: boolean;
  onToggle: () => void;
  onPreview?: () => void;
  style?: React.CSSProperties;
}

export function SourceItem({
  document,
  isSelected,
  onToggle,
  onPreview,
  style,
}: SourceItemProps) {
  const deleteDocument = useDeleteDocument();
  const [isExpanded, setIsExpanded] = useState(false);

  const isReady = document.processing_status === "ready";
  const isProcessing = document.processing_status === "processing";
  const isFailed = document.processing_status === "failed";

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    deleteDocument.mutate(document.id);
  }

  return (
    <div
      className={cn(
        "group mb-2 rounded-xl border p-3 transition-all duration-150 animate-slide-in-left",
        isSelected && isReady
          ? "border-primary/30 bg-primary/5"
          : "border-border hover:border-muted-foreground/30"
      )}
      style={style}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected && isReady}
          onCheckedChange={onToggle}
          disabled={!isReady}
          className="mt-0.5 rounded"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileIcon type={document.file_type} />
            <span className="truncate text-sm font-medium">
              {document.filename}
            </span>
          </div>

          {/* Processing status */}
          {isProcessing && (
            <div className="mt-2">
              <Progress value={document.processing_progress} className="h-1" />
              <span className="text-xs text-muted-foreground">
                Processing... {document.processing_progress}%
              </span>
            </div>
          )}

          {isFailed && (
            <p className="mt-1 text-xs text-destructive">
              {document.processing_error || "Processing failed"}
            </p>
          )}

          {/* Expandable details */}
          {isReady && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {isExpanded ? "Hide details" : "View details"}
            </button>
          )}

          {isExpanded && isReady && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground animate-slide-in-top">
              <p>{formatFileSize(document.file_size)}</p>
              <p>{document.chunk_count} chunks</p>
              {document.page_count && <p>{document.page_count} pages</p>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onPreview && isReady && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteDocument.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4 shrink-0 text-muted-foreground";

  switch (type) {
    case "pdf":
      return <FileText className={iconClass} />;
    case "docx":
    case "doc":
      return <FileType className={iconClass} />;
    case "md":
    case "txt":
      return <FileCode className={iconClass} />;
    case "html":
      return <FileCode className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
