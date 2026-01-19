"use client";

import { useState, useEffect, useRef } from "react";
import { StickyNote, PanelLeftOpen, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotesList, AddNoteForm } from "./notes-list";
import { PanelHeader } from "./panel-header";
import {
  ARTIFACTS,
  useArtifacts,
  MindMapView,
} from "@/components/studio/artifacts";
import { ArtifactCard } from "@/components/studio/artifact-card";
import { ArtifactGallery } from "@/components/studio/artifact-gallery";
import { CustomizeMindMapDialog } from "@/components/studio/customize-mindmap-dialog";
import { showToast } from "@/components/ui/toast";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/use-notes";
import { useDocuments } from "@/hooks/use-documents";
import { useStudioCollapsed } from "@/stores/notebook-store";
import { useActiveTask } from "@/stores/task-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudioPanelProps {
  notebookId: string;
  onToggleCollapse?: () => void;
}

export function StudioPanel({
  notebookId,
  onToggleCollapse,
}: StudioPanelProps) {
  const collapsed = useStudioCollapsed();
  const [showAddNote, setShowAddNote] = useState(false);
  const [viewingArtifact, setViewingArtifact] = useState<string | null>(null);
  const [customizingArtifact, setCustomizingArtifact] = useState<string | null>(
    null,
  );

  const { data: notes = [] } = useNotes(notebookId);
  const createNote = useCreateNote(notebookId);
  const updateNote = useUpdateNote(notebookId);
  const deleteNote = useDeleteNote(notebookId);

  const { data: documents = [] } = useDocuments(notebookId);
  const hasReadySources = documents.some(
    (doc) => doc.processing_status === "ready",
  );

  const { mindmap } = useArtifacts(notebookId);
  const {
    query: mindMapQuery,
    generate: mindMapGenerate,
    delete: mindMapDelete,
  } = mindmap;

  const activeTask = useActiveTask(notebookId, "mindmap");
  const isGenerating =
    activeTask?.status === "pending" || activeTask?.status === "processing";

  const previousStatusRef = useRef<string | null>(null);
  const mindMapStatus = mindMapQuery.data?.generation_status ?? null;

  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = mindMapStatus;

    const wasGenerating = previous === "pending" || previous === "processing";
    if (!wasGenerating) return;

    if (mindMapStatus === "ready") {
      showToast("Mind Map is ready", "success", {
        label: "View",
        onClick: () => setViewingArtifact("mindmap"),
      });
    } else if (mindMapStatus === "failed") {
      showToast("Failed to generate Mind Map", "error");
    }
  }, [mindMapStatus]);

  const readySourceCount = documents.filter(
    (doc) => doc.processing_status === "ready",
  ).length;

  const generatedArtifacts =
    mindMapQuery.data?.generation_status === "ready"
      ? [{ type: "mindmap" as const, data: mindMapQuery.data }]
      : [];

  function handleArtifactClick(id: string) {
    if (id === "mindmap") {
      if (mindMapQuery.data?.generation_status === "ready") {
        setViewingArtifact("mindmap");
      } else if (!isGenerating) {
        setCustomizingArtifact("mindmap");
      }
    }
  }

  function handleGenerateMindMap(options: { focusTopic?: string }) {
    mindMapGenerate.mutate(options);
    setCustomizingArtifact(null);
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-divider">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onToggleCollapse}
            className="[&_svg]:size-5"
            title="Expand studio"
          >
            <PanelLeftOpen />
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center py-4">
          <div className="flex flex-col items-center gap-1.5">
            {ARTIFACTS.slice(0, 4).map((artifact) => (
              <Tooltip key={artifact.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!artifact.enabled || !hasReadySources}
                    title={artifact.label}
                    onClick={
                      artifact.enabled && hasReadySources
                        ? () => handleArtifactClick(artifact.id)
                        : undefined
                    }
                  >
                    <artifact.icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {!hasReadySources
                      ? "Add sources to enable"
                      : artifact.label}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="mt-auto">
            <Button
              variant="fab"
              size="fab-sm"
              title="Add note"
              onClick={onToggleCollapse}
            >
              <StickyNote />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Studio"
        collapseIcon={<PanelLeftOpen />}
        onToggleCollapse={onToggleCollapse}
        actions={
          isGenerating && (
            <div className="flex items-center gap-2 text-xs text-on-surface-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{activeTask?.progress ?? 0}%</span>
            </div>
          )
        }
      />

      {viewingArtifact === "mindmap" && mindMapQuery.data && (
        <MindMapView
          data={mindMapQuery.data.data}
          onClose={() => setViewingArtifact(null)}
          onRegenerate={() => mindMapGenerate.mutate()}
          isRegenerating={mindMapGenerate.isPending}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {ARTIFACTS.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              isLoading={artifact.id === "mindmap" && isGenerating}
              progress={
                artifact.id === "mindmap" ? (activeTask?.progress ?? 0) : 0
              }
              onClick={() => handleArtifactClick(artifact.id)}
              disabled={!hasReadySources}
              disabledReason="Add sources to enable"
            />
          ))}
        </div>

        {generatedArtifacts.length > 0 && (
          <>
            <div className="-mx-4 my-5 border-t border-divider" />
            <ArtifactGallery
              artifacts={generatedArtifacts}
              sourceCount={readySourceCount}
              onView={(type) => setViewingArtifact(type)}
              onRegenerate={(type) => {
                if (type === "mindmap") {
                  mindMapGenerate.mutate();
                }
              }}
              onDelete={(type) => {
                if (type === "mindmap") {
                  mindMapDelete.mutate();
                  showToast("Mind Map deleted", "info");
                }
              }}
            />
          </>
        )}

        {showAddNote && (
          <div className="mt-4">
            <AddNoteForm
              onAdd={(content, title) => {
                createNote.mutate({ content, title });
                setShowAddNote(false);
              }}
              onCancel={() => setShowAddNote(false)}
            />
          </div>
        )}

        {notes.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-heading text-sm font-semibold text-on-surface">
              Notes
            </h3>
            <NotesList
              notes={notes}
              onUpdate={(noteId, title, content) =>
                updateNote.mutate({ noteId, title, content })
              }
              onDelete={(noteId) => deleteNote.mutate(noteId)}
            />
          </div>
        )}

        {generatedArtifacts.length === 0 &&
          notes.length === 0 &&
          !showAddNote && (
            <div className="mt-8 flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant">
                <Wand2 className="h-5 w-5 text-on-surface-muted" />
              </div>
              <p className="text-sm text-on-surface-muted">
                Studio output will appear here
              </p>
              <p className="mt-1 max-w-[220px] text-xs text-on-surface-subtle">
                Generate Audio Overviews, Mind Maps, Study Guides, and more from
                your sources
              </p>
            </div>
          )}
      </div>

      <div className="flex justify-center p-4">
        <Button
          onClick={() => setShowAddNote(true)}
          disabled={showAddNote}
          variant="tonal"
          className="gap-2 rounded-full px-5"
        >
          <StickyNote className="h-4 w-4" />
          Add note
        </Button>
      </div>

      <CustomizeMindMapDialog
        open={customizingArtifact === "mindmap"}
        onOpenChange={(open) => !open && setCustomizingArtifact(null)}
        onGenerate={handleGenerateMindMap}
        isGenerating={isGenerating}
      />
    </div>
  );
}
