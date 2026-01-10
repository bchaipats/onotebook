"use client";

import { Plus } from "lucide-react";

interface CreateNotebookCardProps {
  onClick: () => void;
}

export function CreateNotebookCard({ onClick }: CreateNotebookCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-card-create-border bg-card-create p-8 transition-all duration-200 hover:border-muted-foreground/50 hover:bg-muted/30"
    >
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <span className="text-xl font-normal text-foreground">
        Create new notebook
      </span>
    </div>
  );
}
