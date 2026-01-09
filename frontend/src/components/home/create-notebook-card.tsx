"use client";

import { Plus } from "lucide-react";

interface CreateNotebookCardProps {
  onClick: () => void;
}

export function CreateNotebookCard({ onClick }: CreateNotebookCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-card-create-border bg-card-create p-8 transition-all duration-200 hover:border-primary/50 hover:bg-card-create/80"
    >
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Plus className="h-8 w-8 text-primary/70" />
      </div>
      <span className="text-xl font-normal text-foreground">
        Create new notebook
      </span>
    </div>
  );
}
