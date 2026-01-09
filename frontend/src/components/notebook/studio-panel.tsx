"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STUDIO_TOOLS = [
  { icon: Mic, label: "Audio Overview" },
  { icon: Video, label: "Video Overview" },
  { icon: GitBranch, label: "Mind Map" },
  { icon: FileText, label: "Reports" },
  { icon: CreditCard, label: "Flashcards" },
  { icon: HelpCircle, label: "Quiz" },
  { icon: BarChart3, label: "Infographic" },
  { icon: Presentation, label: "Slide Deck" },
];

interface StudioPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StudioPanel({
  collapsed = false,
  onToggleCollapse,
}: StudioPanelProps) {
  // Collapsed state - show only icon strip
  if (collapsed) {
    return (
      <div
        className="flex h-full cursor-pointer flex-col items-center py-4"
        onClick={onToggleCollapse}
      >
        <span className="writing-vertical-lr text-sm font-semibold text-muted-foreground">
          Studio
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Studio</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
          title="Collapse panel"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_TOOLS.map((tool) => (
            <button
              key={tool.label}
              disabled
              className="flex items-center gap-2 rounded-xl border bg-background p-3 text-left opacity-60 transition-all hover:bg-muted/50 disabled:cursor-not-allowed"
            >
              <tool.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center p-4 text-center">
          <Wand2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Studio output will be saved here.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            After adding sources, click to add Audio Overview, Study Guide, Mind
            Map, and more!
          </p>
        </div>
      </div>

      <div className="border-t p-3">
        <Button
          disabled
          className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          <StickyNote className="h-4 w-4" />
          Add note
        </Button>
      </div>
    </div>
  );
}
