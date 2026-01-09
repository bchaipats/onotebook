"use client";

import { Plus } from "lucide-react";

interface CreateNotebookCardProps {
  onClick: () => void;
}

export function CreateNotebookCard({ onClick }: CreateNotebookCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-muted-foreground/20 bg-transparent p-6"
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
        <Plus className="h-7 w-7 text-muted-foreground" />
      </div>
      <span className="text-xl font-normal text-foreground">
        Create new notebook
      </span>
    </div>
  );
}
