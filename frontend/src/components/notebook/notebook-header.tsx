"use client";

import { useState } from "react";
import { Plus, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import type { Notebook } from "@/types/api";

function ONotebookLogo() {
  return (
    <svg
      width="32"
      height="32"
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
  const [title, setTitle] = useState(notebook.name);

  function handleTitleBlur() {
    if (!title.trim() || title === notebook.name) {
      setTitle(notebook.name);
      return;
    }

    updateNotebook.mutate({ id: notebook.id, data: { name: title.trim() } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setTitle(notebook.name);
      e.currentTarget.blur();
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1 transition-colors hover:bg-muted"
          title="ONotebook Homepage"
        >
          <ONotebookLogo />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
          className="w-64 rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-medium transition-colors hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button className="gap-1.5 rounded-full" size="sm">
          <Plus className="h-4 w-4" />
          Create notebook
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-full">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="gap-1.5 rounded-full"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-user-avatar text-sm font-medium text-white">
          U
        </div>
      </div>
    </header>
  );
}
