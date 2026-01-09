"use client";

import { useState, useEffect } from "react";
import { NotebookHeader } from "./notebook-header";
import { SourcesPanel } from "./sources-panel";
import { StudioPanel } from "./studio-panel";
import { ChatPanel } from "./chat-panel";
import { useDocuments } from "@/hooks/use-documents";
import type { Notebook } from "@/types/api";

interface NotebookLayoutProps {
  notebook: Notebook;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function NotebookLayout({
  notebook,
  onBack,
  onOpenSettings,
}: NotebookLayoutProps) {
  const { data: documents } = useDocuments(notebook.id);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set()
  );

  // Initialize with all sources selected when documents load
  useEffect(() => {
    if (documents && documents.length > 0) {
      const readyDocs = documents.filter((d) => d.processing_status === "ready");
      setSelectedSources(new Set(readyDocs.map((d) => d.id)));
    }
  }, [documents]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <NotebookHeader
        notebook={notebook}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sources Panel */}
        <aside className="hidden w-80 shrink-0 border-r bg-card md:flex md:flex-col">
          <SourcesPanel
            notebookId={notebook.id}
            selectedSources={selectedSources}
            onSelectionChange={setSelectedSources}
          />
        </aside>

        {/* Center: Chat Panel */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatPanel
            notebookId={notebook.id}
            selectedSources={selectedSources}
          />
        </main>

        {/* Right: Studio Panel */}
        <aside className="hidden w-72 shrink-0 border-l bg-card lg:flex lg:flex-col">
          <StudioPanel />
        </aside>
      </div>
    </div>
  );
}
