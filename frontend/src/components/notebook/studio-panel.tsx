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
  {
    icon: Mic,
    label: "Audio Overview",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  },
  {
    icon: Video,
    label: "Video Overview",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    icon: GitBranch,
    label: "Mind Map",
    enabled: true,
    color:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    icon: FileText,
    label: "Reports",
    color:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    icon: CreditCard,
    label: "Flashcards",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    icon: HelpCircle,
    label: "Quiz",
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  {
    icon: BarChart3,
    label: "Infographic",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  },
  {
    icon: Presentation,
    label: "Slide Deck",
    color:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
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
      <div className="flex h-full flex-col items-center gap-2 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
          title="Expand studio"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          {STUDIO_TOOLS.slice(0, 4).map((tool) => (
            <Button
              key={tool.label}
              variant="ghost"
              size="icon-sm"
              disabled={!tool.enabled}
              className="rounded-lg"
              title={tool.label}
              onClick={tool.enabled ? handleMindMapClick : undefined}
            >
              <tool.icon className="h-4 w-4" />
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
            <StickyNote className="h-5 w-5" />
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

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {STUDIO_TOOLS.map((tool, index) => {
            const isMindMap = tool.label === "Mind Map";
            const isLoading = isMindMap && isGeneratingMindMap;
            return (
              <button
                key={tool.label}
                disabled={!tool.enabled || isLoading}
                onClick={tool.enabled ? handleMindMapClick : undefined}
                className={`animate-spring-in-up stagger-${Math.min(index + 1, 8)} flex flex-col items-start gap-3 rounded-2xl bg-surface-container p-4 text-left transition-all duration-200 hover:bg-surface-container-high hover:shadow-elevation-1 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.color}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <tool.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm font-medium">
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
          <div className="mt-6">
            <h3 className="mb-3 font-heading text-sm font-semibold text-muted-foreground">
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
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-surface-container p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-10">
              <Wand2 className="h-7 w-7 text-primary" />
            </div>
            <p className="font-heading text-sm font-semibold text-foreground">
              Studio output will appear here
            </p>
            <p className="mt-2 max-w-[200px] text-xs text-muted-foreground">
              Generate Audio Overviews, Mind Maps, Study Guides, and more from
              your sources
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end p-4">
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
