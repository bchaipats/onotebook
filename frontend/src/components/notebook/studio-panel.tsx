"use client";

import { useState } from "react";
import {
  Mic,
  Video,
  GitBranch,
  FileText,
  CreditCard,
  HelpCircle,
  BarChart3,
  Presentation,
  StickyNote,
  PanelLeftOpen,
  Wand2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotesList, AddNoteForm } from "./notes-list";
import { PanelHeader } from "./panel-header";
import { MindMapView } from "@/components/studio/mind-map";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/use-notes";
import { useMindMap, useGenerateMindMap } from "@/hooks/use-studio";

const STUDIO_TOOLS = [
  { icon: Mic, label: "Audio Overview" },
  { icon: Video, label: "Video Overview" },
  { icon: GitBranch, label: "Mind Map", enabled: true },
  { icon: FileText, label: "Reports" },
  { icon: CreditCard, label: "Flashcards" },
  { icon: HelpCircle, label: "Quiz" },
  { icon: BarChart3, label: "Infographic" },
  { icon: Presentation, label: "Slide Deck" },
];

interface StudioPanelProps {
  notebookId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StudioPanel({
  notebookId,
  collapsed = false,
  onToggleCollapse,
}: StudioPanelProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);

  const { data: notes = [] } = useNotes(notebookId);
  const createNote = useCreateNote(notebookId);
  const updateNote = useUpdateNote(notebookId);
  const deleteNote = useDeleteNote(notebookId);

  const { data: mindMapData } = useMindMap(notebookId);
  const generateMindMap = useGenerateMindMap(notebookId);

  function handleMindMapClick() {
    if (mindMapData) {
      setShowMindMap(true);
    } else {
      setIsGeneratingMindMap(true);
      generateMindMap.mutate(undefined, {
        onSuccess: () => {
          setIsGeneratingMindMap(false);
          setShowMindMap(true);
        },
        onError: () => {
          setIsGeneratingMindMap(false);
        },
      });
    }
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-1 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-9 w-9"
          title="Expand studio"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="mt-2 flex flex-col items-center gap-1">
          {STUDIO_TOOLS.map((tool) => (
            <Button
              key={tool.label}
              variant="ghost"
              size="icon"
              disabled={!tool.enabled}
              className="h-9 w-9"
              title={tool.label}
              onClick={tool.enabled ? handleMindMapClick : undefined}
            >
              <tool.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="mt-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Add note"
            onClick={onToggleCollapse}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
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
      />

      {showMindMap && mindMapData && (
        <MindMapView
          data={mindMapData.data}
          onClose={() => setShowMindMap(false)}
          onRegenerate={() => generateMindMap.mutate()}
          isRegenerating={generateMindMap.isPending}
        />
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_TOOLS.map((tool) => {
            const isMindMap = tool.label === "Mind Map";
            const isLoading = isMindMap && isGeneratingMindMap;
            return (
              <button
                key={tool.label}
                disabled={!tool.enabled || isLoading}
                onClick={tool.enabled ? handleMindMapClick : undefined}
                className="flex items-center gap-2.5 rounded-xl border bg-card p-3.5 text-left transition-all hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <tool.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-sm">
                  {isLoading ? "Generating..." : tool.label}
                </span>
              </button>
            );
          })}
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
          <div className="mt-4">
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
          <div className="mt-6 flex flex-col items-center p-4 text-center">
            <Wand2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Studio output will be saved here.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              After adding sources, click to add Audio Overview, Study Guide,
              Mind Map, and more!
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end p-3">
        <Button
          onClick={() => setShowAddNote(true)}
          disabled={showAddNote}
          className="gap-2 rounded-full bg-foreground px-4 text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          <StickyNote className="h-4 w-4" />
          Add note
        </Button>
      </div>
    </div>
  );
}
