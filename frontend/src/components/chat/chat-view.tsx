"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Square,
  RefreshCw,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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
  const [stoppedContent, setStoppedContent] = useState("");
  const [currentSources, setCurrentSources] = useState<SourceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);

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
        // User cancelled - keep partial content visible
        if (stoppedByUserRef.current) {
          // Refresh messages to get the saved user message
          invalidateMessages();
          // Don't clear streaming content - it will be shown as partial response
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

  function handleRetryMessage() {
    if (lastFailedMessage) {
      handleSend(lastFailedMessage);
    }
  }

  function handleStop() {
    stoppedByUserRef.current = true;
    // Save partial content before stopping
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
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled - keep partial content visible
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
        {allMessages.length === 0 && !isStreaming && !stoppedContent ? (
          <WelcomeState onSelectPrompt={(prompt) => setInputValue(prompt)} />
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
                onCitationClick={setHighlightedCitation}
              />
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 rounded-lg bg-muted p-3">
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
                      {streamingContent}
                    </ReactMarkdown>
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
            {!isStreaming && stoppedContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 rounded-lg bg-muted p-3">
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
                      {stoppedContent}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    Generation stopped
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sources Panel */}
      <SourcesPanel
        sources={currentSources}
        highlightedCitation={highlightedCitation}
        onClearHighlight={() => setHighlightedCitation(null)}
      />

      {/* Error */}
      {error && (
        <div className="border-t border-border bg-destructive/10 p-3 text-center text-sm text-destructive">
          <span>{error}</span>
          {lastFailedMessage && (
            <Button
              variant="link"
              size="sm"
              className="ml-2 h-auto p-0 text-destructive font-medium"
              onClick={handleRetryMessage}
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
                onClick={() => handleSend()}
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

interface CodeBlockProps {
  language: string | undefined;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
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
        title="Copy code"
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

interface CitationLinkProps {
  index: number;
  onClick: (index: number) => void;
}

function CitationLink({ index, onClick }: CitationLinkProps) {
  return (
    <button
      onClick={() => onClick(index)}
      className="inline-flex items-center justify-center rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/30 transition-colors"
      title={`Go to source ${index}`}
    >
      [{index}]
    </button>
  );
}

// Helper to process text and replace [1], [2], etc. with clickable citations
function processTextWithCitations(
  text: string,
  onCitationClick: (index: number) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the citation link
    const citationIndex = parseInt(match[1], 10);
    parts.push(
      <CitationLink
        key={`citation-${match.index}`}
        index={citationIndex}
        onClick={onCitationClick}
      />
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Process React children recursively to handle citations in text
function processChildren(
  children: React.ReactNode,
  onCitationClick: (index: number) => void
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === "string") {
      const processed = processTextWithCitations(child, onCitationClick);
      return processed.length === 1 && typeof processed[0] === "string"
        ? child
        : <React.Fragment key={idx}>{processed}</React.Fragment>;
    }
    return child;
  });
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onCitationClick?: (index: number) => void;
}

function MessageBubble({ message, onRegenerate, onCitationClick }: MessageBubbleProps) {
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
              // Process citations in text nodes
              p({ children }) {
                if (!onCitationClick || isUser) {
                  return <p>{children}</p>;
                }
                return (
                  <p>
                    {processChildren(children, onCitationClick)}
                  </p>
                );
              },
              li({ children }) {
                if (!onCitationClick || isUser) {
                  return <li>{children}</li>;
                }
                return (
                  <li>
                    {processChildren(children, onCitationClick)}
                  </li>
                );
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
  );
}

const SUGGESTED_PROMPTS = [
  "Summarize the key points from my documents",
  "What are the main topics covered?",
  "Find information about...",
  "Compare and contrast the different perspectives",
];

interface WelcomeStateProps {
  onSelectPrompt: (prompt: string) => void;
}

function WelcomeState({ onSelectPrompt }: WelcomeStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-md">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold">Start a conversation</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Ask questions about your documents and get answers with citations.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onSelectPrompt(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SourcesPanelProps {
  sources: SourceInfo[];
  highlightedCitation: number | null;
  onClearHighlight: () => void;
}

function SourcesPanel({ sources, highlightedCitation, onClearHighlight }: SourcesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const sourceRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Scroll to highlighted source when citation is clicked
  useEffect(() => {
    if (highlightedCitation !== null && sourceRefs.current[highlightedCitation]) {
      sourceRefs.current[highlightedCitation]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Auto-expand the highlighted source
      const highlightedSource = sources.find(s => s.citation_index === highlightedCitation);
      if (highlightedSource) {
        setExpanded(prev => ({ ...prev, [highlightedSource.chunk_id]: true }));
      }
      // Clear highlight after a delay
      const timeout = setTimeout(() => {
        onClearHighlight();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [highlightedCitation, sources, onClearHighlight]);

  function toggleExpanded(chunkId: string) {
    setExpanded((prev) => ({ ...prev, [chunkId]: !prev[chunkId] }));
  }

  return (
    <div className="border-t border-border bg-muted/50 p-4">
      <div className="mx-auto max-w-3xl">
        <h3 className="mb-3 text-sm font-medium">Sources ({sources.length})</h3>
        {sources.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              Sources will appear when you ask questions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => {
              const isHighlighted = highlightedCitation === source.citation_index;
              return (
                <div
                  key={source.chunk_id}
                  ref={(el) => { sourceRefs.current[source.citation_index] = el; }}
                  className={cn(
                    "rounded-lg border p-3 transition-all duration-300",
                    isHighlighted
                      ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                      : "border-border bg-background"
                  )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
