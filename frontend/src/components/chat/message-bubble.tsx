"use client";

import React, {
  memo,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { Bot, Pencil, X, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMessageFeedback } from "@/hooks/use-chat";
import { useCreateNote } from "@/hooks/use-notes";
import { CodeBlock } from "./code-block";
import { CitationButton, ShowMoreCitationsButton } from "./citation-button";
import { MessageToolbar } from "./message-toolbar";
import { ModificationButtons } from "./modification-buttons";
import { processChildren } from "@/lib/citation-utils";
import type { ChatMessage, SourceInfo } from "@/types/api";

interface MessageBubbleProps {
  message: ChatMessage;
  sessionId: string;
  notebookId: string;
  sources?: SourceInfo[];
  onRegenerate?: (instruction?: string) => void;
  showModificationButtons?: boolean;
  onCitationClick?: (index: number) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onContinue?: () => void;
  isStreaming?: boolean;
  searchQuery?: string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  sessionId,
  notebookId,
  sources,
  onRegenerate,
  showModificationButtons,
  onCitationClick,
  onEdit,
  onContinue,
  isStreaming,
  searchQuery,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showAllCitations, setShowAllCitations] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [initialHeight, setInitialHeight] = useState<number | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const feedbackMutation = useMessageFeedback(sessionId);
  const createNote = useCreateNote(notebookId);

  useLayoutEffect(() => {
    if (!isUser && bubbleRef.current && initialHeight === null) {
      setInitialHeight(bubbleRef.current.scrollHeight);
      const timer = setTimeout(() => setInitialHeight(null), 150);
      return () => clearTimeout(timer);
    }
  }, [isUser, initialHeight]);

  const hasSearchMatch =
    searchQuery &&
    searchQuery.length > 0 &&
    message.content.toLowerCase().includes(searchQuery.toLowerCase());

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
      editTextareaRef.current.focus();
    }
  }, [isEditing, editContent]);

  function handleStartEdit() {
    setEditContent(message.content);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setEditContent(message.content);
    setIsEditing(false);
  }

  function handleSaveEdit() {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      handleCancelEdit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
  }

  function handleSaveToNote() {
    createNote.mutate(
      { content: message.content, sourceMessageId: message.id },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  function handleRate(newRating: "up" | "down") {
    const feedback = message.feedback === newRating ? null : newRating;
    feedbackMutation.mutate({ messageId: message.id, feedback });
  }

  const renderCitation = (
    index: number,
    source: SourceInfo | undefined,
    key: string,
  ) => (
    <CitationButton
      key={key}
      index={index}
      source={source}
      onClick={onCitationClick!}
    />
  );

  const renderShowMore = (count: number) => (
    <ShowMoreCitationsButton
      key="show-more"
      count={count}
      onClick={() => setShowAllCitations(true)}
    />
  );

  // Ensure timestamp is parsed as UTC (append Z if no timezone indicator)
  const timestamp = message.created_at;
  const messageDate = new Date(
    timestamp.endsWith("Z") || timestamp.includes("+")
      ? timestamp
      : timestamp + "Z",
  );
  const relativeTime = formatDistanceToNow(messageDate, { addSuffix: true });
  const absoluteTime = format(messageDate, "PPpp");

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
          <Bot className="h-5 w-5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] flex-1",
          isUser && "flex flex-col items-end",
        )}
      >
        {isUser && isEditing ? (
          <UserEditMode
            editContent={editContent}
            setEditContent={setEditContent}
            editTextareaRef={editTextareaRef}
            onKeyDown={handleEditKeyDown}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
            originalContent={message.content}
          />
        ) : (
          <div
            ref={!isUser ? bubbleRef : undefined}
            className={cn(
              "group relative inline-block rounded-2xl px-4 py-3 transition-[min-height] duration-150",
              isUser
                ? "bg-primary-muted text-on-primary-muted shadow-elevation-1"
                : "text-on-surface",
              hasSearchMatch && "ring-2 ring-primary/50",
            )}
            style={
              !isUser && initialHeight
                ? { minHeight: initialHeight }
                : undefined
            }
          >
            <div
              className={cn(
                "mb-1 text-[10px] text-on-surface-muted opacity-0 transition-opacity group-hover:opacity-100",
                isUser && "text-right",
              )}
              title={absoluteTime}
            >
              {relativeTime}
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match && !className;
                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <CodeBlock language={match?.[1]}>
                        {String(children).replace(/\n$/, "")}
                      </CodeBlock>
                    );
                  },
                  p({ children }) {
                    if (!onCitationClick || isUser) return <p>{children}</p>;
                    return (
                      <p>
                        {processChildren({
                          children,
                          sources,
                          showAllCitations,
                          onShowMore: () => setShowAllCitations(true),
                          renderCitation,
                          renderShowMore,
                        })}
                      </p>
                    );
                  },
                  li({ children }) {
                    if (!onCitationClick || isUser) return <li>{children}</li>;
                    return (
                      <li>
                        {processChildren({
                          children,
                          sources,
                          showAllCitations,
                          onShowMore: () => setShowAllCitations(true),
                          renderCitation,
                          renderShowMore,
                        })}
                      </li>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {isUser && onEdit && !isStreaming && (
              <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            )}
            {!isUser && (
              <MessageToolbar
                content={message.content}
                feedback={message.feedback}
                onRate={handleRate}
                onSaveToNote={handleSaveToNote}
                onRegenerate={onRegenerate ? () => onRegenerate() : undefined}
                onContinue={onContinue}
                isFeedbackPending={feedbackMutation.isPending}
                isNoteSaving={createNote.isPending}
                isNoteSaved={saved}
              />
            )}
            {!isUser && showModificationButtons && onRegenerate && (
              <ModificationButtons onRegenerate={onRegenerate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface UserEditModeProps {
  editContent: string;
  setEditContent: (content: string) => void;
  editTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onCancel: () => void;
  onSave: () => void;
  originalContent: string;
}

function UserEditMode({
  editContent,
  setEditContent,
  editTextareaRef,
  onKeyDown,
  onCancel,
  onSave,
  originalContent,
}: UserEditModeProps) {
  return (
    <div className="w-full max-w-md">
      <textarea
        ref={editTextareaRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        rows={1}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8">
          <X className="mr-1 h-3 w-3" />
          Cancel
        </Button>
        <Button
          variant="filled"
          size="sm"
          onClick={onSave}
          disabled={!editContent.trim() || editContent === originalContent}
          className="h-8"
        >
          <Check className="mr-1 h-3 w-3" />
          Save & Submit
        </Button>
      </div>
      <p className="mt-1 text-xs text-on-surface-muted">
        Press Cmd/Ctrl+Enter to save, Escape to cancel
      </p>
    </div>
  );
}
