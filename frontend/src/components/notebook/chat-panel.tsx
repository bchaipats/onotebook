"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Square,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  Bot,
  ArrowUp,
  Upload,
  SlidersHorizontal,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useMessages,
  useInvalidateMessages,
  useInvalidateChatSessions,
} from "@/hooks/use-chat";
import { sendMessage, regenerateMessage } from "@/lib/api";
import type {
  ChatMessage,
  SourceInfo,
  StreamEvent,
  Notebook,
} from "@/types/api";
import { ChatConfigDialog } from "./chat-config-dialog";

export interface HighlightedCitation {
  documentId: string;
  documentName: string;
  chunkContent: string;
  citationIndex: number;
}

interface ChatPanelProps {
  notebookId: string;
  notebook: Notebook;
  selectedSources: Set<string>;
  hasDocuments: boolean;
  onCitationHighlight?: (citation: HighlightedCitation) => void;
}

export function ChatPanel({
  notebookId,
  notebook,
  selectedSources,
  hasDocuments,
  onCitationHighlight,
}: ChatPanelProps) {
  const { data: sessions, isLoading: sessionsLoading } =
    useChatSessions(notebookId);
  const createSession = useCreateChatSession(notebookId);
  const deleteSession = useDeleteChatSession(notebookId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  function handleDeleteChat() {
    if (!activeSessionId) return;
    deleteSession.mutate(activeSessionId, {
      onSuccess: () => {
        // Switch to next session or create new one
        const otherSessions = sessions?.filter((s) => s.id !== activeSessionId);
        if (otherSessions && otherSessions.length > 0) {
          setActiveSessionId(otherSessions[0].id);
        } else {
          setActiveSessionId(null);
        }
      },
    });
  }

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
            title="Configure chat"
            onClick={() => setConfigDialogOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Chat options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDeleteChat}
                disabled={!activeSessionId || deleteSession.isPending}
                className="text-destructive focus:text-destructive"
              >
                {deleteSession.isPending
                  ? "Deleting..."
                  : "Delete chat history"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChatConfigDialog
        notebook={notebook}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      {sessionsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeSessionId ? (
        <ChatContent
          sessionId={activeSessionId}
          notebookId={notebookId}
          selectedSources={selectedSources}
          onCitationHighlight={onCitationHighlight}
        />
      ) : (
        <ChatWelcome
          hasDocuments={hasDocuments}
          onCreateSession={handleNewSession}
        />
      )}
    </div>
  );
}

interface ChatContentProps {
  sessionId: string;
  notebookId: string;
  selectedSources: Set<string>;
  onCitationHighlight?: (citation: HighlightedCitation) => void;
}

function ChatContent({
  sessionId,
  notebookId,
  selectedSources,
  onCitationHighlight,
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
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);

  // Handle citation click - notify parent for left panel highlighting
  const handleCitationClick = useCallback(
    (index: number) => {
      if (onCitationHighlight && currentSources.length > 0) {
        const source = currentSources.find((s) => s.citation_index === index);
        if (source) {
          onCitationHighlight({
            documentId: source.document_id,
            documentName: source.document_name,
            chunkContent: source.content,
            citationIndex: index,
          });
        }
      }
    },
    [currentSources, onCitationHighlight],
  );

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

  const suggestedQuestions = [
    "What are the main topics covered in my sources?",
    "Summarize the key points",
    "What questions can you answer based on my sources?",
  ];

  function handleSuggestedQuestion(question: string) {
    handleSend(question);
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {allMessages.length === 0 && !isStreaming && !stoppedContent ? (
          selectedSources.size === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                <Upload className="h-7 w-7 text-primary/70" />
              </div>
              <h2 className="mb-3 text-lg font-medium">
                Add a source to get started
              </h2>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {}}
              >
                Upload a source
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-lg font-medium">
                Ask about your sources
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                I can help you understand and analyze your{" "}
                {selectedSources.size} selected source
                {selectedSources.size !== 1 ? "s" : ""}.
              </p>
              <div className="flex flex-col gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-6">
            {allMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                sources={
                  message.id === lastAssistantMessage?.id
                    ? currentSources
                    : undefined
                }
                onRegenerate={
                  message.role === "assistant" &&
                  message.id === lastAssistantMessage?.id &&
                  !isStreaming
                    ? () => handleRegenerate(message.id)
                    : undefined
                }
                onCitationClick={handleCitationClick}
              />
            ))}
            {isStreaming && streamingContent && (
              <StreamingMessage
                content={streamingContent}
                sources={currentSources}
                onCitationClick={handleCitationClick}
              />
            )}
            {isStreaming && !streamingContent && <ThinkingIndicator />}
            {!isStreaming && stoppedContent && (
              <StoppedMessage content={stoppedContent} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

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

function ChatWelcome({
  hasDocuments,
  onCreateSession,
}: {
  hasDocuments: boolean;
  onCreateSession: () => void;
}) {
  if (hasDocuments) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-3 text-lg font-medium">Ready to chat</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Ask questions about your sources
        </p>
        <Button onClick={onCreateSession} className="rounded-full">
          Start chatting
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-primary/40">
        <Upload className="h-6 w-6 text-primary/60" />
      </div>
      <h2 className="mb-3 text-lg font-medium">Add a source to get started</h2>
      <Button variant="outline" className="rounded-full">
        Upload a source
      </Button>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  sources?: SourceInfo[];
  onRegenerate?: () => void;
  onCitationClick?: (index: number) => void;
}

function MessageBubble({
  message,
  sources,
  onRegenerate,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showAllCitations, setShowAllCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleRate(newRating: "up" | "down") {
    // Toggle off if clicking the same rating
    setRating(rating === newRating ? null : newRating);
  }

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
                  return (
                    <p>
                      {processChildren({
                        children,
                        onCitationClick,
                        sources,
                        showAllCitations,
                        onShowMore: () => setShowAllCitations(true),
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
                        onCitationClick,
                        sources,
                        showAllCitations,
                        onShowMore: () => setShowAllCitations(true),
                      })}
                    </li>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {!isUser && (
            <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy response"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", rating === "up" && "text-green-600")}
                onClick={() => handleRate("up")}
                title="Good response"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", rating === "down" && "text-red-600")}
                onClick={() => handleRate("down")}
                title="Bad response"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
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
          )}
        </div>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
  sources?: SourceInfo[];
  onCitationClick?: (index: number) => void;
}

function StreamingMessage({
  content,
  sources,
  onCitationClick,
}: StreamingMessageProps) {
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
              p({ children }) {
                if (!onCitationClick) return <p>{children}</p>;
                return (
                  <p>
                    {processChildren({
                      children,
                      onCitationClick,
                      sources,
                      showAllCitations: true, // Always show all during streaming
                    })}
                  </p>
                );
              },
              li({ children }) {
                if (!onCitationClick) return <li>{children}</li>;
                return (
                  <li>
                    {processChildren({
                      children,
                      onCitationClick,
                      sources,
                      showAllCitations: true, // Always show all during streaming
                    })}
                  </li>
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
        Searching your sources...
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

interface CitationButtonProps {
  index: number;
  sourceName?: string;
  onClick: (index: number) => void;
}

function CitationButton({ index, sourceName, onClick }: CitationButtonProps) {
  const button = (
    <button
      onClick={() => onClick(index)}
      className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
    >
      {index}
    </button>
  );

  if (sourceName) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <span className="font-medium">{index}:</span> {sourceName}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function ShowMoreCitationsButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mx-0.5 inline-flex h-5 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
    >
      +{count} more
    </button>
  );
}

interface ProcessCitationsOptions {
  text: string;
  onCitationClick: (index: number) => void;
  sources?: SourceInfo[];
  maxCitations?: number;
  showAllCitations?: boolean;
  onShowMore?: () => void;
}

function processTextWithCitations({
  text,
  onCitationClick,
  sources,
  maxCitations = 3,
  showAllCitations = false,
  onShowMore,
}: ProcessCitationsOptions): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;
  let citationCount = 0;
  const allCitations: Array<{
    index: number;
    matchIndex: number;
    source?: SourceInfo;
  }> = [];

  // First pass: collect all citations
  while ((match = citationRegex.exec(text)) !== null) {
    const citationIndex = parseInt(match[1], 10);
    const source = sources?.find((s) => s.citation_index === citationIndex);
    allCitations.push({
      index: citationIndex,
      matchIndex: match.index,
      source,
    });
  }

  // Second pass: build parts with potential truncation
  citationRegex.lastIndex = 0;
  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citationIndex = parseInt(match[1], 10);
    const source = sources?.find((s) => s.citation_index === citationIndex);

    citationCount++;
    const shouldShow = showAllCitations || citationCount <= maxCitations;

    if (shouldShow) {
      parts.push(
        <CitationButton
          key={`citation-${match.index}`}
          index={citationIndex}
          sourceName={source?.document_name}
          onClick={onCitationClick}
        />,
      );
    } else if (citationCount === maxCitations + 1 && onShowMore) {
      // Add "Show more" button at the first hidden citation
      parts.push(
        <ShowMoreCitationsButton
          key="show-more"
          count={allCitations.length - maxCitations}
          onClick={onShowMore}
        />,
      );
    }
    // Skip other hidden citations (don't add them to parts)

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface ProcessChildrenOptions {
  children: React.ReactNode;
  onCitationClick: (index: number) => void;
  sources?: SourceInfo[];
  showAllCitations?: boolean;
  onShowMore?: () => void;
}

function processChildren({
  children,
  onCitationClick,
  sources,
  showAllCitations,
  onShowMore,
}: ProcessChildrenOptions): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === "string") {
      const processed = processTextWithCitations({
        text: child,
        onCitationClick,
        sources,
        showAllCitations,
        onShowMore,
      });
      return processed.length === 1 && typeof processed[0] === "string" ? (
        child
      ) : (
        <React.Fragment key={idx}>{processed}</React.Fragment>
      );
    }
    return child;
  });
}
