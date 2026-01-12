"use client";

import { Plus } from "lucide-react";

interface CreateNotebookCardProps {
  onClick: () => void;
}

export function CreateNotebookCard({ onClick }: CreateNotebookCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 transition-all duration-200 hover:bg-hover"
    >
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted">
        <Plus className="h-8 w-8 text-on-primary-muted" />
      </div>
      <span className="text-xl font-normal text-on-surface">
        Create new notebook
      </span>
    </div>
  );
}
