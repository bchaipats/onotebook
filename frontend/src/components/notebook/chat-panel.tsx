"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Square,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Copy,
  Check,
  Bot,
  ArrowUp,
  Upload,
  SlidersHorizontal,
  MoreVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useChatSessions,
  useCreateChatSession,
  useMessages,
  useInvalidateMessages,
  useInvalidateChatSessions,
} from "@/hooks/use-chat";
import { sendMessage, regenerateMessage } from "@/lib/api";
import type { ChatMessage, SourceInfo, StreamEvent } from "@/types/api";

interface ChatPanelProps {
  notebookId: string;
  selectedSources: Set<string>;
}

export function ChatPanel({ notebookId, selectedSources }: ChatPanelProps) {
  const { data: sessions, isLoading: sessionsLoading } =
    useChatSessions(notebookId);
  const createSession = useCreateChatSession(notebookId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auto-select first session or create new one
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  async function handleNewSession() {
    createSession.mutate("New Chat", {
      onSuccess: (session) => {
        setActiveSessionId(session.id);
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold">Chat</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Configure notebook"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Chat options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {sessionsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeSessionId ? (
        <ChatContent
          sessionId={activeSessionId}
          notebookId={notebookId}
          selectedSources={selectedSources}
        />
      ) : (
        <ChatWelcome onCreateSession={handleNewSession} />
      )}
    </div>
  );
}

interface ChatContentProps {
  sessionId: string;
  notebookId: string;
  selectedSources: Set<string>;
}

function ChatContent({
  sessionId,
  notebookId,
  selectedSources,
}: ChatContentProps) {
  const { data: messages, isLoading } = useMessages(sessionId);
  const invalidateMessages = useInvalidateMessages(sessionId);
  const invalidateSessions = useInvalidateChatSessions(notebookId);

  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [stoppedContent, setStoppedContent] = useState("");
  const [currentSources, setCurrentSources] = useState<SourceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(
    null,
  );
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleEvent = useCallback(
    (event: StreamEvent) => {
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
    },
    [invalidateMessages, invalidateSessions],
  );

  async function handleSend(retryContent?: string) {
    const content = retryContent || inputValue.trim();
    if (!content || isStreaming) return;

    if (!retryContent) {
      setInputValue("");
    }
    setError(null);
    setLastFailedMessage(null);
    setIsStreaming(true);
    setStreamingContent("");
    setStoppedContent("");
    setCurrentSources([]);
    stoppedByUserRef.current = false;

    abortControllerRef.current = new AbortController();

    // Pass selected document IDs for filtering
    const documentIds =
      selectedSources.size > 0 ? Array.from(selectedSources) : undefined;

    try {
      await sendMessage(
        sessionId,
        content,
        null, // model - use default
        handleEvent,
        abortControllerRef.current.signal,
        documentIds,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (stoppedByUserRef.current) {
          invalidateMessages();
          return;
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setLastFailedMessage(content);
      }
      setIsStreaming(false);
      setStreamingContent("");
    }
  }

  function handleStop() {
    stoppedByUserRef.current = true;
    setStoppedContent(streamingContent);
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  async function handleRegenerate(messageId: string) {
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");
    setStoppedContent("");
    setCurrentSources([]);
    stoppedByUserRef.current = false;

    abortControllerRef.current = new AbortController();

    try {
      await regenerateMessage(
        messageId,
        handleEvent,
        abortControllerRef.current.signal,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (stoppedByUserRef.current) {
          invalidateMessages();
          return;
        }
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

  function handleSuggestionClick(suggestion: string) {
    setInputValue(suggestion);
    setTimeout(() => handleSend(suggestion), 100);
  }

  const allMessages = messages || [];
  const lastAssistantMessage = allMessages.findLast(
    (m) => m.role === "assistant",
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {allMessages.length === 0 && !isStreaming && !stoppedContent ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-primary/40">
              <Upload className="h-6 w-6 text-primary/60" />
            </div>
            <h2 className="mb-2 text-lg font-medium">
              Add a source to get started
            </h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              Ask questions about your sources. The AI will reference specific
              passages to answer.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestionClick(q)}
                  className="rounded-full border bg-card px-4 py-2 text-sm transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-6">
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
                onCitationClick={setHighlightedCitation}
              />
            ))}
            {isStreaming && streamingContent && (
              <StreamingMessage content={streamingContent} />
            )}
            {isStreaming && !streamingContent && <ThinkingIndicator />}
            {!isStreaming && stoppedContent && (
              <StoppedMessage content={stoppedContent} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {currentSources.length > 0 && (
        <SourcesPanel
          sources={currentSources}
          highlightedCitation={highlightedCitation}
          onClearHighlight={() => setHighlightedCitation(null)}
        />
      )}

      {error && (
        <div className="border-t bg-destructive/10 p-3 text-center text-sm text-destructive">
          <span>{error}</span>
          {lastFailedMessage && (
            <Button
              variant="link"
              size="sm"
              className="ml-2 h-auto p-0 font-medium text-destructive"
              onClick={() => handleSend(lastFailedMessage!)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            className="ml-2 h-auto p-0 text-destructive/70"
            onClick={() => {
              setError(null);
              setLastFailedMessage(null);
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="border-t border-border/50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedSources.size === 0
                  ? "Upload a source to get started"
                  : "Ask about your sources..."
              }
              className="flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              rows={1}
              disabled={isStreaming || selectedSources.size === 0}
            />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              {selectedSources.size} sources
            </span>
            {isStreaming ? (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={handleStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || selectedSources.size === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border/50 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          ONotebook may make mistakes. Consider verifying important information.
        </p>
      </div>
    </>
  );
}

const SUGGESTED_PROMPTS = [
  "What are the main topics covered?",
  "Summarize the key points",
  "What questions does this raise?",
  "Find connections between ideas",
];

function ChatWelcome({ onCreateSession }: { onCreateSession: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-primary/40">
        <Upload className="h-6 w-6 text-primary/60" />
      </div>
      <h2 className="mb-3 text-lg font-medium">Add a source to get started</h2>
      <Button
        variant="outline"
        onClick={onCreateSession}
        className="rounded-full"
      >
        Upload a source
      </Button>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onCitationClick?: (index: number) => void;
}

function MessageBubble({
  message,
  onRegenerate,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          isUser ? "bg-user-avatar text-white" : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? "U" : <Bot className="h-5 w-5" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] flex-1",
          isUser && "flex flex-col items-end",
        )}
      >
        <div
          className={cn(
            "group inline-block rounded-2xl px-4 py-3",
            isUser ? "bg-muted text-foreground" : "bg-transparent",
          )}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
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
                  return <p>{processChildren(children, onCitationClick)}</p>;
                },
                li({ children }) {
                  if (!onCitationClick || isUser) return <li>{children}</li>;
                  return <li>{processChildren(children, onCitationClick)}</li>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
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
    </div>
  );
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="prose prose-sm max-w-none dark:prose-invert">
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
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Thinking...
      </div>
    </div>
  );
}

function StoppedMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <div className="mt-2 text-xs italic text-muted-foreground">
          Generation stopped
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  language,
  children,
}: {
  language?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group/code relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded bg-gray-700 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-gray-600 hover:text-white group-hover/code:opacity-100"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function CitationLink({
  index,
  onClick,
}: {
  index: number;
  onClick: (index: number) => void;
}) {
  return (
    <button
      onClick={() => onClick(index)}
      className="inline-flex items-center justify-center rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
    >
      [{index}]
    </button>
  );
}

function processTextWithCitations(
  text: string,
  onCitationClick: (index: number) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citationIndex = parseInt(match[1], 10);
    parts.push(
      <CitationLink
        key={`citation-${match.index}`}
        index={citationIndex}
        onClick={onCitationClick}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function processChildren(
  children: React.ReactNode,
  onCitationClick: (index: number) => void,
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === "string") {
      const processed = processTextWithCitations(child, onCitationClick);
      return processed.length === 1 && typeof processed[0] === "string" ? (
        child
      ) : (
        <React.Fragment key={idx}>{processed}</React.Fragment>
      );
    }
    return child;
  });
}

interface SourcesPanelProps {
  sources: SourceInfo[];
  highlightedCitation: number | null;
  onClearHighlight: () => void;
}

function SourcesPanel({
  sources,
  highlightedCitation,
  onClearHighlight,
}: SourcesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const sourceRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (
      highlightedCitation !== null &&
      sourceRefs.current[highlightedCitation]
    ) {
      sourceRefs.current[highlightedCitation]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      const highlightedSource = sources.find(
        (s) => s.citation_index === highlightedCitation,
      );
      if (highlightedSource) {
        setExpanded((prev) => ({
          ...prev,
          [highlightedSource.chunk_id]: true,
        }));
      }
      const timeout = setTimeout(() => onClearHighlight(), 3000);
      return () => clearTimeout(timeout);
    }
  }, [highlightedCitation, sources, onClearHighlight]);

  return (
    <div className="border-t bg-muted/50 p-4">
      <div className="mx-auto max-w-3xl">
        <h3 className="mb-3 text-sm font-medium">Sources ({sources.length})</h3>
        <div className="space-y-2">
          {sources.map((source) => {
            const isHighlighted = highlightedCitation === source.citation_index;
            return (
              <div
                key={source.chunk_id}
                ref={(el) => {
                  sourceRefs.current[source.citation_index] = el;
                }}
                className={cn(
                  "rounded-xl border p-3 transition-all duration-300",
                  isHighlighted
                    ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                    : "border-border bg-card",
                )}
              >
                <div
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [source.chunk_id]: !prev[source.chunk_id],
                    }))
                  }
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
