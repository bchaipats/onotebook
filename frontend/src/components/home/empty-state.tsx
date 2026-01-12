"use client";

import { CreateNotebookCard } from "./create-notebook-card";

interface EmptyStateProps {
  onCreateNotebook: () => void;
}

export function EmptyState({ onCreateNotebook }: EmptyStateProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="mb-6 text-2xl font-medium text-on-background">
        Recent notebooks
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CreateNotebookCard onClick={onCreateNotebook} />
      </div>
    </div>
  );
}
