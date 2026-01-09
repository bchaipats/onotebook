"use client";

import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/components/chat/model-selector";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import type { Notebook } from "@/types/api";

function NotebookIconSmall() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V12Z"
        fill="#D4A853"
      />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H32L40 14V38C40 40.2091 38.2091 42 36 42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="#F5C869"
      />
      <path d="M32 6V14H40L32 6Z" fill="#D4A853" />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H14V42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="#E8B84A"
      />
    </svg>
  );
}

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
      { onSuccess: () => setIsEditing(false) },
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

        {/* Notebook icon + editable title */}
        <div className="flex items-center gap-2">
          <NotebookIconSmall />

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
