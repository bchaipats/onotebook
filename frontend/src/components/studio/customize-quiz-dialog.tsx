"use client";

import { useState } from "react";
import { HelpCircle, Wand2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuizOptions } from "@/types/studio";

interface CustomizeQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: QuizOptions) => void;
  isGenerating: boolean;
}

export function CustomizeQuizDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: CustomizeQuizDialogProps) {
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [focusTopic, setFocusTopic] = useState("");

  function handleGenerate() {
    onGenerate({
      questionCount,
      difficulty,
      focusTopic: focusTopic.trim() || undefined,
    });
    setFocusTopic("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-on-primary-muted">
            <HelpCircle className="h-6 w-6" />
          </div>
          <DialogTitle>Generate Quiz</DialogTitle>
          <DialogDescription>
            Create a quiz to test your knowledge of the source material.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question-count">Number of questions</Label>
            <Select
              value={String(questionCount)}
              onValueChange={(v) => setQuestionCount(Number(v) as 5 | 10 | 15)}
            >
              <SelectTrigger id="question-count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 questions</SelectItem>
                <SelectItem value="10">10 questions</SelectItem>
                <SelectItem value="15">15 questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) =>
                setDifficulty(v as "easy" | "medium" | "hard")
              }
            >
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus-topic">Focus topic (optional)</Label>
            <Input
              id="focus-topic"
              placeholder="e.g., Key concepts from Chapter 3"
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
