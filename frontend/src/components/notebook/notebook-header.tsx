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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
    <header className="flex h-14 items-center justify-between bg-background-notebook px-4">
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
          className="w-64 bg-transparent px-1 py-1 text-lg font-medium outline-none focus:outline-none"
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
