"use client";

import {
  Sparkles,
  Plus,
  Mic,
  Video,
  GitBranch,
  FileText,
  CreditCard,
  HelpCircle,
  BarChart3,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STUDIO_TOOLS = [
  { icon: Mic, label: "Audio" },
  { icon: Video, label: "Video" },
  { icon: GitBranch, label: "Mind Map" },
  { icon: FileText, label: "Reports" },
  { icon: CreditCard, label: "Flashcards" },
  { icon: HelpCircle, label: "Quiz" },
  { icon: BarChart3, label: "Infographic" },
  { icon: Presentation, label: "Slides" },
];

export function StudioPanel() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-4">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">Studio</h2>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Generate content from your sources
        </p>

        <div className="grid grid-cols-2 gap-3">
          {STUDIO_TOOLS.map((tool) => (
            <button
              key={tool.label}
              disabled
              className="flex flex-col items-center gap-2 rounded-xl border bg-muted/30 p-4 opacity-50 cursor-not-allowed transition-all"
            >
              <tool.icon className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {tool.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-muted/50 p-3 text-center">
          <span className="text-xs text-muted-foreground">Coming soon</span>
        </div>
      </div>

      {/* Add Note Button */}
      <div className="border-t p-4">
        <Button
          disabled
          className="w-full gap-2 rounded-full bg-foreground text-background opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add note
        </Button>
      </div>
    </div>
  );
}
