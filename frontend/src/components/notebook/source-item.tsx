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
  Globe,
  Youtube,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useDeleteDocument } from "@/hooks/use-documents";
import { cn, formatFileSize } from "@/lib/utils";
import type { Document } from "@/types/api";

interface SourceItemProps {
  document: Document;
  isSelected: boolean;
  onToggle: () => void;
  onPreview?: () => void;
  className?: string;
}

export function SourceItem({
  document,
  isSelected,
  onToggle,
  onPreview,
  className,
}: SourceItemProps) {
  const deleteDocument = useDeleteDocument(document.notebook_id);
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
        "group rounded-2xl p-3 transition-all duration-200",
        isSelected && isReady
          ? "bg-primary-10 shadow-elevation-1"
          : "bg-surface-container hover:bg-surface-container-high hover:shadow-elevation-1",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected && isReady}
          onCheckedChange={onToggle}
          disabled={!isReady}
          className="mt-1 rounded-md border-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <SourceIcon
              sourceType={document.source_type}
              fileType={document.file_type}
            />
            <span className="truncate text-sm font-medium">
              {document.filename}
            </span>
          </div>

          {/* Status indicator */}
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={document.processing_status} />
            {isReady && (
              <span className="text-xs text-muted-foreground">
                {document.chunk_count} chunks
              </span>
            )}
          </div>

          {/* Processing progress */}
          {isProcessing && (
            <div className="mt-2">
              <Progress
                value={document.processing_progress}
                className="h-1.5 rounded-full"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Processing... {document.processing_progress}%
              </span>
            </div>
          )}

          {isFailed && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {document.processing_error || "Processing failed"}
            </p>
          )}

          {/* Expandable details */}
          {isReady && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
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
            <div className="mt-2 space-y-1.5 rounded-xl bg-surface-container-high p-3 text-xs text-muted-foreground animate-spring-in">
              <p className="flex justify-between">
                <span>Size</span>
                <span className="font-medium text-foreground">
                  {formatFileSize(document.file_size)}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Chunks</span>
                <span className="font-medium text-foreground">
                  {document.chunk_count}
                </span>
              </p>
              {document.page_count && (
                <p className="flex justify-between">
                  <span>Pages</span>
                  <span className="font-medium text-foreground">
                    {document.page_count}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onPreview && isReady && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
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
            size="icon-sm"
            className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
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

function StatusPill({ status }: { status: string }) {
  const styles = {
    ready: "bg-success/15 text-success",
    processing: "bg-warning/15 text-warning animate-subtle-pulse",
    failed: "bg-destructive/15 text-destructive",
  };

  const labels = {
    ready: "Ready",
    processing: "Processing",
    failed: "Failed",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status as keyof typeof styles] || styles.ready,
      )}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function SourceIcon({
  sourceType,
  fileType,
}: {
  sourceType: string;
  fileType: string;
}) {
  const iconClass = "h-4 w-4";
  const wrapperClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl";

  // Handle source type first (URL, YouTube, paste)
  switch (sourceType) {
    case "url":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-url) 92% 0.04 h)",
          }}
        >
          <Globe
            className={iconClass}
            style={{ color: "var(--ref-source-url)" }}
          />
        </div>
      );
    case "youtube":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-youtube) 92% 0.04 h)",
          }}
        >
          <Youtube
            className={iconClass}
            style={{ color: "var(--ref-source-youtube)" }}
          />
        </div>
      );
    case "paste":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-paste) 92% 0.04 h)",
          }}
        >
          <StickyNote
            className={iconClass}
            style={{ color: "var(--ref-source-paste)" }}
          />
        </div>
      );
  }

  // Fall back to file type icons
  switch (fileType) {
    case "pdf":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-pdf) 92% 0.04 h)",
          }}
        >
          <FileText
            className={iconClass}
            style={{ color: "var(--ref-source-pdf)" }}
          />
        </div>
      );
    case "docx":
    case "doc":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-doc) 92% 0.04 h)",
          }}
        >
          <FileType
            className={iconClass}
            style={{ color: "var(--ref-source-doc)" }}
          />
        </div>
      );
    case "md":
    case "txt":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-text) 92% 0.02 h)",
          }}
        >
          <FileCode
            className={iconClass}
            style={{ color: "var(--ref-source-text)" }}
          />
        </div>
      );
    case "html":
      return (
        <div
          className={cn(wrapperClass)}
          style={{
            backgroundColor: "oklch(from var(--ref-source-html) 92% 0.04 h)",
          }}
        >
          <FileCode
            className={iconClass}
            style={{ color: "var(--ref-source-html)" }}
          />
        </div>
      );
    default:
      return (
        <div className={cn(wrapperClass, "bg-surface-container-high")}>
          <File className={cn(iconClass, "text-muted-foreground")} />
        </div>
      );
  }
}
