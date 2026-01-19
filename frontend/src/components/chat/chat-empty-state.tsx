"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatEmptyStateProps {
  onRequestAddSources: () => void;
}

export function ChatEmptyState({ onRequestAddSources }: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant">
        <Upload className="h-7 w-7 text-on-surface-muted" />
      </div>
      <h2 className="mb-3 text-lg font-medium text-on-surface">
        Add a source to get started
      </h2>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={onRequestAddSources}
      >
        Upload a source
      </Button>
    </div>
  );
}
