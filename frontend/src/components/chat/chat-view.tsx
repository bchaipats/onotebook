"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Square,
  RefreshCw,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMessages, useInvalidateMessages, useInvalidateChatSessions } from "@/hooks/use-chat";
import { sendMessage, regenerateMessage } from "@/lib/api";
import type { ChatMessage, SourceInfo, StreamEvent } from "@/types/api";

interface ChatViewProps {
  sessionId: string;
  notebookId: string;
  selectedModel: string | null;
}

export function ChatView({ sessionId, notebookId, selectedModel }: ChatViewProps) {
  const { data: messages, isLoading } = useMessages(sessionId);
  const invalidateMessages = useInvalidateMessages(sessionId);
  const invalidateSessions = useInvalidateChatSessions(notebookId);

  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentSources, setCurrentSources] = useState<SourceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "sources":
        setCurrentSources(event.sources || []);
        break;
      case "token":
        setStreamingContent((prev) => prev + (event.content || ""));
        break;
      case "done":
        setIsStreaming(false);
        setStreamingContent("");
        invalidateMessages();
        invalidateSessions();
        break;
      case "error":
        setError(event.error || "An error occurred");
        setIsStreaming(false);
        setStreamingContent("");
        break;
    }
  }, [invalidateMessages, invalidateSessions]);

  async function handleSend() {
    if (!inputValue.trim() || isStreaming) return;

    const content = inputValue.trim();
    setInputValue("");
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");
    setCurrentSources([]);

    abortControllerRef.current = new AbortController();

    try {
      await sendMessage(
        sessionId,
        content,
        selectedModel,
        handleEvent,
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled
      } else {
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
      setIsStreaming(false);
      setStreamingContent("");
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  async function handleRegenerate(messageId: string) {
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");
    setCurrentSources([]);

    abortControllerRef.current = new AbortController();

    try {
      await regenerateMessage(
        messageId,
        handleEvent,
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled
      } else {
        setError(err instanceof Error ? err.message : "Failed to regenerate");
      }
      setIsStreaming(false);
      setStreamingContent("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const allMessages = messages || [];
  const lastAssistantMessage = allMessages.findLast((m) => m.role === "assistant");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {allMessages.length === 0 && !isStreaming ? (
          <WelcomeState />
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {allMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={
                  message.role === "assistant" &&
                  message.id === lastAssistantMessage?.id &&
                  !isStreaming
                    ? () => handleRegenerate(message.id)
                    : undefined
                }
              />
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 rounded-lg bg-muted p-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sources Panel */}
      {currentSources.length > 0 && (
        <SourcesPanel sources={currentSources} />
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-border bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
          <Button
            variant="link"
            size="sm"
            className="ml-2 h-auto p-0 text-destructive"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                rows={1}
                disabled={isStreaming}
              />
            </div>
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleStop}
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
}

function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? "U" : <MessageSquare className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "group flex-1 rounded-lg p-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isUser ? "prose-invert" : "dark:prose-invert"
          )}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {onRegenerate && (
          <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Start a conversation</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about your documents and get answers with citations.
        </p>
      </div>
    </div>
  );
}

interface SourcesPanelProps {
  sources: SourceInfo[];
}

function SourcesPanel({ sources }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleExpanded(chunkId: string) {
    setExpanded((prev) => ({ ...prev, [chunkId]: !prev[chunkId] }));
  }

  return (
    <div className="border-t border-border bg-muted/50 p-4">
      <div className="mx-auto max-w-3xl">
        <h3 className="mb-3 text-sm font-medium">Sources ({sources.length})</h3>
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.chunk_id}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div
                className="flex cursor-pointer items-center gap-2"
                onClick={() => toggleExpanded(source.chunk_id)}
              >
                {expanded[source.chunk_id] ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">
                  [{source.citation_index}] {source.document_name}
                </span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {Math.round(source.relevance_score * 100)}%
                </span>
              </div>
              {expanded[source.chunk_id] && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {source.content}
                </div>
              )}
              {!expanded[source.chunk_id] && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {source.content}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
