"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Panel,
  Group,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";
import { NotebookHeader } from "./notebook-header";
import { SourcesPanel } from "./sources-panel";
import { StudioPanel } from "./studio-panel";
import { ChatPanel, type HighlightedCitation } from "./chat-panel";
import { ResizeHandle } from "./panel-resize-handle";
import { useDocuments } from "@/hooks/use-documents";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { Notebook } from "@/types/api";

interface NotebookLayoutProps {
  notebook: Notebook;
  onBack: () => void;
  onOpenSettings: () => void;
  autoOpenAddSources?: boolean;
}

const PANEL_SIZES = {
  sourcesDefault: "22%",
  sourcesExpanded: "35%",
  sourcesCollapsed: "3%",
  sourcesMin: "15%",
  studioDefault: "22%",
  studioContracted: "15%",
  studioCollapsed: "3%",
  studioMin: "10%",
  chatMin: "30%",
} as const;

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
  const [isViewingSourceDetail, setIsViewingSourceDetail] = useState(false);
  const [highlightedCitation, setHighlightedCitation] =
    useState<HighlightedCitation | null>(null);

  const breakpoint = useBreakpoint();
  const sourcesPanelRef = useRef<PanelImperativeHandle>(null);
  const studioPanelRef = useRef<PanelImperativeHandle>(null);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const readyDocs = documents.filter(
        (d) => d.processing_status === "ready",
      );
      setSelectedSources(new Set(readyDocs.map((d) => d.id)));
    }
  }, [documents]);

  const handleSourcesToggleCollapse = useCallback(() => {
    if (sourcesPanelRef.current?.isCollapsed()) {
      sourcesPanelRef.current.expand();
    } else {
      sourcesPanelRef.current?.collapse();
    }
  }, []);

  const handleStudioToggleCollapse = useCallback(() => {
    if (studioPanelRef.current?.isCollapsed()) {
      studioPanelRef.current.expand();
    } else {
      studioPanelRef.current?.collapse();
    }
  }, []);

  const handleCitationHighlight = useCallback(
    (citation: HighlightedCitation) => {
      setHighlightedCitation(citation);
      if (sourcesPanelRef.current?.isCollapsed()) {
        sourcesPanelRef.current.expand();
      }
    },
    [],
  );

  useEffect(() => {
    if (!highlightedCitation) return;
    const timeout = setTimeout(() => setHighlightedCitation(null), 5000);
    return () => clearTimeout(timeout);
  }, [highlightedCitation]);

  useEffect(() => {
    if (!sourcesPanelRef.current) return;

    if (isViewingSourceDetail) {
      if (!sourcesPanelRef.current.isCollapsed()) {
        sourcesPanelRef.current.resize(PANEL_SIZES.sourcesExpanded);
      }
      if (studioPanelRef.current && !studioPanelRef.current.isCollapsed()) {
        studioPanelRef.current.resize(PANEL_SIZES.studioContracted);
      }
    } else {
      if (!sourcesPanelRef.current.isCollapsed()) {
        sourcesPanelRef.current.resize(PANEL_SIZES.sourcesDefault);
      }
      if (studioPanelRef.current && !studioPanelRef.current.isCollapsed()) {
        studioPanelRef.current.resize(PANEL_SIZES.studioDefault);
      }
    }
  }, [isViewingSourceDetail]);

  const handleSourcesResize = useCallback(
    (size: PanelSize) => {
      const isNowCollapsed = size.asPercentage <= 5;
      if (isNowCollapsed !== sourcesCollapsed) {
        setSourcesCollapsed(isNowCollapsed);
      }
    },
    [sourcesCollapsed],
  );

  const handleStudioResize = useCallback(
    (size: PanelSize) => {
      const isNowCollapsed = size.asPercentage <= 5;
      if (isNowCollapsed !== studioCollapsed) {
        setStudioCollapsed(isNowCollapsed);
      }
    },
    [studioCollapsed],
  );

  // Shared panel content components
  const sourcesContent = (
    <div className="flex h-full flex-col rounded-3xl bg-surface shadow-elevation-1">
      <SourcesPanel
        notebookId={notebook.id}
        selectedSources={selectedSources}
        onSelectionChange={setSelectedSources}
        autoOpenAddSources={autoOpenAddSources}
        collapsed={sourcesCollapsed}
        onToggleCollapse={handleSourcesToggleCollapse}
        highlightedCitation={highlightedCitation}
        onViewingDetailChange={setIsViewingSourceDetail}
      />
    </div>
  );

  const chatContent = (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-elevation-1">
      <ChatPanel
        notebookId={notebook.id}
        notebook={notebook}
        selectedSources={selectedSources}
        hasDocuments={!!documents && documents.length > 0}
        onCitationHighlight={handleCitationHighlight}
      />
    </div>
  );

  const studioContent = (
    <div className="flex h-full flex-col rounded-3xl bg-surface shadow-elevation-1">
      <StudioPanel
        notebookId={notebook.id}
        collapsed={studioCollapsed}
        onToggleCollapse={handleStudioToggleCollapse}
      />
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background text-on-background">
      <NotebookHeader
        notebook={notebook}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />

      <div className="flex flex-1 overflow-hidden px-4 pb-4 pt-1">
        {/* Small screens: Chat only */}
        {breakpoint === "sm" && <div className="flex-1">{chatContent}</div>}

        {/* Medium screens: Sources + Chat */}
        {breakpoint === "md" && (
          <Group
            orientation="horizontal"
            className="flex-1"
          >
            <Panel
              id="sources"
              panelRef={sourcesPanelRef}
              collapsible
              collapsedSize={PANEL_SIZES.sourcesCollapsed}
              minSize={PANEL_SIZES.sourcesMin}
              defaultSize={PANEL_SIZES.sourcesDefault}
              onResize={handleSourcesResize}
            >
              {sourcesContent}
            </Panel>
            <ResizeHandle />
            <Panel id="chat" minSize={PANEL_SIZES.chatMin}>
              {chatContent}
            </Panel>
          </Group>
        )}

        {/* Large screens: Sources + Chat + Studio */}
        {breakpoint === "lg" && (
          <Group
            orientation="horizontal"
            className="flex-1"
          >
            <Panel
              id="sources"
              panelRef={sourcesPanelRef}
              collapsible
              collapsedSize={PANEL_SIZES.sourcesCollapsed}
              minSize={PANEL_SIZES.sourcesMin}
              defaultSize={PANEL_SIZES.sourcesDefault}
              onResize={handleSourcesResize}
            >
              {sourcesContent}
            </Panel>
            <ResizeHandle />
            <Panel id="chat" minSize={PANEL_SIZES.chatMin}>
              {chatContent}
            </Panel>
            <ResizeHandle />
            <Panel
              id="studio"
              panelRef={studioPanelRef}
              collapsible
              collapsedSize={PANEL_SIZES.studioCollapsed}
              minSize={PANEL_SIZES.studioMin}
              defaultSize={PANEL_SIZES.studioDefault}
              onResize={handleStudioResize}
            >
              {studioContent}
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
}
