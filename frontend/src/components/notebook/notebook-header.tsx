"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateNotebook, useCreateNotebook } from "@/hooks/use-notebooks";
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
  const router = useRouter();
  const updateNotebook = useUpdateNotebook();
  const createNotebook = useCreateNotebook();
  const [title, setTitle] = useState(notebook.name);

  function handleCreateNotebook() {
    createNotebook.mutate(
      { name: "Untitled notebook" },
      {
        onSuccess: (newNotebook) => {
          router.push(`/notebook/${newNotebook.id}?new=true`);
        },
      },
    );
  }

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
    <header className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1 transition-colors"
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
          className="w-64 px-1 py-1 text-2xl font-medium outline-none focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="h-[var(--header-button-height)] gap-2 rounded-full px-5"
          onClick={handleCreateNotebook}
          disabled={createNotebook.isPending}
        >
          <Plus className="h-4 w-4" />
          Create notebook
        </Button>
        <Button
          variant="outline"
          className="h-[var(--header-button-height)] gap-2 rounded-full px-5"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button
          variant="outline"
          onClick={onOpenSettings}
          className="h-[var(--header-button-height)] gap-2 rounded-full px-5"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <div className="flex h-[var(--header-button-height)] w-[var(--header-button-height)] items-center justify-center rounded-full text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
}
