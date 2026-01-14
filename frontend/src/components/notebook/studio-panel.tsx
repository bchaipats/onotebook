"use client";

import { useState } from "react";
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
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/use-notes";
import { useStudioCollapsed } from "@/stores/notebook-store";
import { useActiveTask } from "@/stores/task-store";

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

  const { data: notes = [] } = useNotes(notebookId);
  const createNote = useCreateNote(notebookId);
  const updateNote = useUpdateNote(notebookId);
  const deleteNote = useDeleteNote(notebookId);

  const { mindmap } = useArtifacts(notebookId);
  const { query: mindMapQuery, generate: mindMapGenerate } = mindmap;

  const activeTask = useActiveTask(notebookId, "mindmap");
  const isGenerating =
    activeTask?.status === "pending" || activeTask?.status === "processing";

  function handleArtifactClick(id: string) {
    if (id === "mindmap") {
      if (mindMapQuery.data?.generation_status === "ready") {
        setViewingArtifact("mindmap");
      } else if (!isGenerating) {
        mindMapGenerate.mutate();
      }
    }
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
              <Button
                key={artifact.id}
                variant="ghost"
                size="icon-sm"
                disabled={!artifact.enabled}
                title={artifact.label}
                onClick={
                  artifact.enabled
                    ? () => handleArtifactClick(artifact.id)
                    : undefined
                }
              >
                <artifact.icon />
              </Button>
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

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {ARTIFACTS.map((artifact, index) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              isLoading={artifact.id === "mindmap" && isGenerating}
              progress={
                artifact.id === "mindmap" ? (activeTask?.progress ?? 0) : 0
              }
              onClick={() => handleArtifactClick(artifact.id)}
              index={index}
            />
          ))}
        </div>

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

        {notes.length === 0 && !showAddNote && (
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-surface-variant p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-muted">
              <Wand2 className="h-7 w-7 text-on-primary-muted" />
            </div>
            <p className="font-heading text-sm font-semibold text-on-surface">
              Studio output will appear here
            </p>
            <p className="mt-2 max-w-[200px] text-xs text-on-surface-muted">
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
    </div>
  );
}
