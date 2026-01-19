"use client";

import { memo } from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  StickyNote,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface MessageToolbarProps {
  content: string;
  feedback?: "up" | "down" | null;
  onRate: (rating: "up" | "down") => void;
  onSaveToNote: () => void;
  onRegenerate?: () => void;
  isFeedbackPending: boolean;
  isNoteSaving: boolean;
  isNoteSaved: boolean;
}

export const MessageToolbar = memo(function MessageToolbar({
  content,
  feedback,
  onRate,
  onSaveToNote,
  onRegenerate,
  isFeedbackPending,
  isNoteSaving,
  isNoteSaved,
}: MessageToolbarProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => copy(content)}
        title="Copy response"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", feedback === "up" && "text-primary")}
        onClick={() => onRate("up")}
        title="Good response"
        disabled={isFeedbackPending}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", feedback === "down" && "text-primary")}
        onClick={() => onRate("down")}
        title="Bad response"
        disabled={isFeedbackPending}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onSaveToNote}
        title="Save to note"
        disabled={isNoteSaving || isNoteSaved}
      >
        {isNoteSaved ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <StickyNote className="h-3.5 w-3.5" />
        )}
      </Button>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-7 gap-1 text-xs"
          onClick={onRegenerate}
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </Button>
      )}
    </div>
  );
});
