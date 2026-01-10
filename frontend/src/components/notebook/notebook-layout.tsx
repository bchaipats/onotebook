"use client";

import { useState, useEffect, useCallback } from "react";
import { NotebookHeader } from "./notebook-header";
import { SourcesPanel } from "./sources-panel";
import { StudioPanel } from "./studio-panel";
import { ChatPanel, type HighlightedCitation } from "./chat-panel";
import { useDocuments } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/types/api";

interface NotebookLayoutProps {
  notebook: Notebook;
  onBack: () => void;
  onOpenSettings: () => void;
  autoOpenAddSources?: boolean;
}

export function NotebookLayout({
  notebook,
  onBack,
  onOpenSettings,
  autoOpenAddSources = false,
}: NotebookLayoutProps) {
  const { data: documents } = useDocuments(notebook.id);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [studioCollapsed, setStudioCollapsed] = useState(false);
  const [highlightedCitation, setHighlightedCitation] =
    useState<HighlightedCitation | null>(null);

  // Initialize with all sources selected when documents load
  useEffect(() => {
    if (documents && documents.length > 0) {
      const readyDocs = documents.filter(
        (d) => d.processing_status === "ready",
      );
      setSelectedSources(new Set(readyDocs.map((d) => d.id)));
    }
  }, [documents]);

  // Handle citation highlight from chat panel
  const handleCitationHighlight = useCallback(
    (citation: HighlightedCitation) => {
      setHighlightedCitation(citation);
      // Expand sources panel if collapsed
      if (sourcesCollapsed) {
        setSourcesCollapsed(false);
      }
    },
    [sourcesCollapsed],
  );

  // Clear highlight after a delay
  useEffect(() => {
    if (highlightedCitation) {
      const timeout = setTimeout(() => {
        setHighlightedCitation(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [highlightedCitation]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <NotebookHeader
        notebook={notebook}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex flex-1 gap-4 overflow-hidden p-4 pt-0">
        {/* Left: Sources Panel */}
        <aside
          className={cn(
            "hidden shrink-0 rounded-2xl bg-muted/50 transition-all duration-300 ease-out md:flex md:flex-col",
            sourcesCollapsed ? "w-14" : "w-80",
          )}
        >
          <SourcesPanel
            notebookId={notebook.id}
            selectedSources={selectedSources}
            onSelectionChange={setSelectedSources}
            autoOpenAddSources={autoOpenAddSources}
            collapsed={sourcesCollapsed}
            onToggleCollapse={() => setSourcesCollapsed(!sourcesCollapsed)}
            highlightedCitation={highlightedCitation}
          />
        </aside>

        {/* Center: Chat Panel */}
        <main className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-card">
          <ChatPanel
            notebookId={notebook.id}
            notebook={notebook}
            selectedSources={selectedSources}
            onCitationHighlight={handleCitationHighlight}
          />
        </main>

        {/* Right: Studio Panel */}
        <aside
          className={cn(
            "hidden shrink-0 rounded-2xl bg-muted/50 transition-all duration-300 ease-out lg:flex lg:flex-col",
            studioCollapsed ? "w-14" : "w-72",
          )}
        >
          <StudioPanel
            collapsed={studioCollapsed}
            onToggleCollapse={() => setStudioCollapsed(!studioCollapsed)}
          />
        </aside>
      </div>
    </div>
  );
}
