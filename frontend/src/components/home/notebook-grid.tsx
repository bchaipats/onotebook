"use client";

import { NotebookCard } from "./notebook-card";
import { FileText } from "lucide-react";
import type { Notebook } from "@/types/api";

interface NotebookGridProps {
  notebooks: Notebook[];
  viewMode: "grid" | "list";
  onSelectNotebook: (notebook: Notebook) => void;
}

export function NotebookGrid({
  notebooks,
  viewMode,
  onSelectNotebook,
}: NotebookGridProps) {
  if (viewMode === "list") {
    return (
      <div className="rounded-2xl border bg-card">
        {/* List Header */}
        <div className="grid grid-cols-12 gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
          <div className="col-span-6">Title</div>
          <div className="col-span-2 text-center">Sources</div>
          <div className="col-span-4 text-right">Modified</div>
        </div>

        {/* List Items */}
        {notebooks.map((notebook, index) => (
          <div
            key={notebook.id}
            onClick={() => onSelectNotebook(notebook)}
            className="grid cursor-pointer grid-cols-12 items-center gap-4 border-b px-6 py-4 transition-colors last:border-b-0 hover:bg-muted/50"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="col-span-6 flex items-center gap-3">
              <div
                className="h-10 w-10 shrink-0 rounded-lg"
                style={{ backgroundColor: notebook.color || "#6366f1" }}
              />
              <span className="truncate font-medium">{notebook.name}</span>
            </div>
            <div className="col-span-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {notebook.document_count}
            </div>
            <div className="col-span-4 text-right text-sm text-muted-foreground">
              {formatRelativeDate(notebook.updated_at)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {notebooks.map((notebook, index) => (
        <NotebookCard
          key={notebook.id}
          notebook={notebook}
          onSelect={() => onSelectNotebook(notebook)}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
