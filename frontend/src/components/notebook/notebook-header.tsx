"use client";

import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/components/chat/model-selector";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import type { Notebook } from "@/types/api";

interface NotebookHeaderProps {
  notebook: Notebook;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function NotebookHeader({
  notebook,
  onBack,
  onOpenSettings,
}: NotebookHeaderProps) {
  const updateNotebook = useUpdateNotebook();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(notebook.name);

  function handleSave() {
    if (!title.trim() || title === notebook.name) {
      setTitle(notebook.name);
      setIsEditing(false);
      return;
    }

    updateNotebook.mutate(
      { id: notebook.id, data: { name: title.trim() } },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Color indicator + editable title */}
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 shrink-0 rounded-lg"
            style={{ backgroundColor: notebook.color || "#6366f1" }}
          />

          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setTitle(notebook.name);
                  setIsEditing(false);
                }
              }}
              className="h-8 w-64 text-lg font-semibold"
              autoFocus
            />
          ) : (
            <button
              className="text-lg font-semibold transition-colors hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              {notebook.name}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector className="hidden sm:flex" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="rounded-full"
        >
          <Settings className="h-5 w-5" />
        </Button>
        {/* User avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-user-avatar text-sm font-medium text-white">
          U
        </div>
      </div>
    </header>
  );
}
