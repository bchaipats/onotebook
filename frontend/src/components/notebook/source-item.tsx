"use client";

import { useState } from "react";
import {
  FileText,
  FileType,
  FileCode,
  File,
  Trash2,
  Pencil,
  Globe,
  Youtube,
  StickyNote,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDeleteDocument, useRenameDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/api";

interface SourceItemProps {
  document: Document;
  isSelected: boolean;
  onToggle: () => void;
  onClick?: () => void;
  className?: string;
}

export function SourceItem({
  document,
  isSelected,
  onToggle,
  onClick,
  className,
}: SourceItemProps) {
  const deleteDocument = useDeleteDocument(document.notebook_id);
  const renameDocument = useRenameDocument(document.notebook_id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(document.filename);
  const [menuOpen, setMenuOpen] = useState(false);

  const isReady = document.processing_status === "ready";
  const isProcessing = document.processing_status === "processing";

  function handleDelete() {
    deleteDocument.mutate(document.id);
  }

  function handleRename() {
    setNewName(document.filename);
    setIsRenaming(true);
  }

  function handleRenameSubmit() {
    if (newName.trim() && newName !== document.filename) {
      renameDocument.mutate({ id: document.id, filename: newName.trim() });
    }
    setIsRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  }

  if (isRenaming) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-2 py-2",
          className,
        )}
      >
        <SourceIcon
          sourceType={document.source_type}
          fileType={document.file_type}
        />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          className="h-8 flex-1"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors",
        isSelected && isReady ? "bg-selected" : "hover:bg-hover",
        className,
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-click]")) return;
        onClick?.();
      }}
    >
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild data-no-click>
          <button className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <span
              className={cn(
                "transition-opacity",
                menuOpen ? "opacity-0" : "opacity-100 group-hover:opacity-0",
              )}
            >
              <SourceIcon
                sourceType={document.source_type}
                fileType={document.file_type}
                isProcessing={isProcessing}
              />
            </span>
            <MoreVertical
              className={cn(
                "absolute inset-0 h-5 w-5 text-on-surface-muted transition-opacity",
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={deleteDocument.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Remove source
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRename}>
            <Pencil className="h-4 w-4" />
            Rename source
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
        {document.filename}
      </span>

      <Checkbox
        data-no-click
        checked={isSelected && isReady}
        onCheckedChange={onToggle}
        disabled={!isReady}
      />
    </div>
  );
}

function SourceIcon({
  sourceType,
  fileType,
  isProcessing,
}: {
  sourceType: string;
  fileType: string;
  isProcessing?: boolean;
}) {
  if (isProcessing) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }

  const iconClass = "h-5 w-5";

  switch (sourceType) {
    case "url":
      return <Globe className={cn(iconClass, "text-primary")} />;
    case "youtube":
      return <Youtube className={cn(iconClass, "text-destructive")} />;
    case "paste":
      return <StickyNote className={cn(iconClass, "text-warning")} />;
  }

  switch (fileType) {
    case "pdf":
      return <FileText className={cn(iconClass, "text-destructive")} />;
    case "docx":
    case "doc":
      return <FileType className={cn(iconClass, "text-primary")} />;
    case "md":
    case "txt":
    case "html":
      return <FileCode className={cn(iconClass, "text-success")} />;
    default:
      return <File className={cn(iconClass, "text-on-surface-muted")} />;
  }
}
