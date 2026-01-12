"use client";

import { NotebookCard } from "./notebook-card";
import { CreateNotebookCard } from "./create-notebook-card";
import { formatDate } from "@/lib/utils";
import type { Notebook } from "@/types/api";

interface NotebookGridProps {
  notebooks: Notebook[];
  viewMode: "grid" | "list";
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: () => void;
}

export function NotebookGrid({
  notebooks,
  viewMode,
  onSelectNotebook,
  onCreateNotebook,
}: NotebookGridProps) {
  if (viewMode === "list") {
    return (
      <div className="rounded-xl border">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm">
          <div className="col-span-6">Title</div>
          <div className="col-span-3 text-center">Sources</div>
          <div className="col-span-3 text-right">Modified</div>
        </div>

        {notebooks.map((notebook) => (
          <div
            key={notebook.id}
            onClick={() => onSelectNotebook(notebook)}
            className="grid cursor-pointer grid-cols-12 items-center gap-4 border-t px-6 py-4 hover:opacity-80"
          >
            <div className="col-span-6 flex items-center gap-4">
              <NotebookIconSmall />
              <span className="font-normal">{notebook.name}</span>
            </div>
            <div className="col-span-3 text-center text-sm">
              {notebook.document_count} sources
            </div>
            <div className="col-span-3 text-right text-sm">
              {formatDate(notebook.updated_at)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-medium">Recent notebooks</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CreateNotebookCard onClick={onCreateNotebook} />
        {notebooks.map((notebook) => (
          <NotebookCard
            key={notebook.id}
            notebook={notebook}
            onSelect={() => onSelectNotebook(notebook)}
          />
        ))}
      </div>
    </div>
  );
}

function NotebookIconSmall() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V12Z"
        fill="currentColor"
      />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H32L40 14V38C40 40.2091 38.2091 42 36 42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="currentColor"
      />
      <path d="M32 6V14H40L32 6Z" fill="currentColor" />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H14V42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="currentColor"
      />
    </svg>
  );
}
