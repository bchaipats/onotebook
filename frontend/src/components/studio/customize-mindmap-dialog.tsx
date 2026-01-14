"use client";

import { useState } from "react";
import { GitBranch, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { MindMapOptions } from "@/types/studio";

interface CustomizeMindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: MindMapOptions) => void;
  isGenerating: boolean;
}

export function CustomizeMindMapDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: CustomizeMindMapDialogProps) {
  const [focusTopic, setFocusTopic] = useState("");

  function handleGenerate() {
    onGenerate({
      focusTopic: focusTopic.trim() || undefined,
    });
    setFocusTopic("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-on-primary-muted">
            <GitBranch className="h-6 w-6" />
          </div>
          <DialogTitle>Generate Mind Map</DialogTitle>
          <DialogDescription>
            Create a visual map of concepts and relationships from your sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="focus-topic">Focus topic (optional)</Label>
            <Input
              id="focus-topic"
              placeholder="e.g., Machine Learning fundamentals"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
            />
            <p className="text-xs text-on-surface-muted">
              Leave empty to cover all topics from your sources
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
