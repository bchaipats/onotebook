"use client";

import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateNotebook: () => void;
}

export function EmptyState({ onCreateNotebook }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">Create your first notebook</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Notebooks help you organize documents and have focused conversations
        about specific topics.
      </p>
      <Button
        onClick={onCreateNotebook}
        className="gap-2 rounded-full bg-foreground px-6 py-2.5 text-background hover:bg-foreground/90"
      >
        <Plus className="h-4 w-4" />
        Create notebook
      </Button>
    </div>
  );
}
