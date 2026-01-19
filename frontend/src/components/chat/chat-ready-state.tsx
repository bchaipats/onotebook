"use client";

import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotebookSummaryCard } from "./notebook-summary-card";
import type { NotebookSummary } from "@/types/api";

interface ChatReadyStateProps {
  selectedSourcesCount: number;
  notebookSummary: NotebookSummary | undefined;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  suggestedQuestions: string[];
  isLoadingSuggestions: boolean;
  onQuestionClick: (question: string) => void;
}

const DEFAULT_QUESTIONS = [
  "What are the main topics covered in my sources?",
  "Summarize the key points",
  "What questions can you answer based on my sources?",
];

export function ChatReadyState({
  selectedSourcesCount,
  notebookSummary,
  onGenerateSummary,
  isGeneratingSummary,
  suggestedQuestions,
  isLoadingSuggestions,
  onQuestionClick,
}: ChatReadyStateProps) {
  const displayedQuestions =
    suggestedQuestions.length > 0 ? suggestedQuestions : DEFAULT_QUESTIONS;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      {notebookSummary?.summary ? (
        <NotebookSummaryCard
          summary={notebookSummary}
          onRegenerate={onGenerateSummary}
          isRegenerating={isGeneratingSummary}
        />
      ) : (
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted">
            <Bot className="h-8 w-8 text-on-primary-muted" />
          </div>
          <h2 className="mb-2 text-lg font-medium text-on-surface">
            Ask about your sources
          </h2>
          <p className="mb-4 text-sm text-on-surface-muted">
            I can help you understand and analyze your {selectedSourcesCount}{" "}
            selected source{selectedSourcesCount !== 1 ? "s" : ""}.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
          >
            {isGeneratingSummary ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-on-primary" />
                Generating summary...
              </>
            ) : (
              "Generate notebook summary"
            )}
          </Button>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center">
        <p className="mb-4 text-sm text-on-surface-muted">Try asking:</p>
        {isLoadingSuggestions ? (
          <div className="flex items-center gap-2 text-sm text-on-surface-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading suggestions...
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {displayedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => onQuestionClick(question)}
                className="rounded-full bg-surface-variant px-4 py-2.5 text-sm text-on-surface shadow-sm transition-colors duration-200 hover:bg-hover"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
