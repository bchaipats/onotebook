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
  ArrowDown,
  Upload,
  SlidersHorizontal,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  StickyNote,
  AlertCircle,
  FileText,
  Pencil,
  X,
  Download,
  FileDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MemoizedMarkdown } from "@/components/chat/memoized-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useMessages,
  useInvalidateMessages,
  useInvalidateChatSessions,
  useMessageFeedback,
} from "@/hooks/use-chat";
import { useCreateNote } from "@/hooks/use-notes";
import { useStreamingBuffer } from "@/hooks/use-streaming-buffer";
import { useScrollSentinel } from "@/hooks/use-scroll-sentinel";
import {
  useNotebookSummary,
  useGenerateNotebookSummary,
} from "@/hooks/use-notebooks";
import {
  sendMessage,
  regenerateMessage,
  editMessage,
  getSuggestedQuestions,
} from "@/lib/api";
import {
  downloadMarkdown,
  exportToPdf,
  copyToClipboard,
} from "@/lib/export-utils";
import type {
  ChatMessage,
  SourceInfo,
  StreamEvent,
  Notebook,
  NotebookSummary,
  GroundingMetadata,
} from "@/types/api";
import { ChatConfigDialog } from "./chat-config-dialog";
import { PanelHeader } from "./panel-header";
import {
  useSelectedSources,
  usePendingChatMessage,
  useNotebookActions,
} from "@/stores/notebook-store";

interface ChatPanelProps {
  notebookId: string;
  notebook: Notebook;
  hasDocuments: boolean;
}

export function ChatPanel({
  notebookId,
  notebook,
  hasDocuments,
}: ChatPanelProps) {
  const { data: sessions, isLoading: sessionsLoading } =
    useChatSessions(notebookId);
  const createSession = useCreateChatSession(notebookId);
  const deleteSession = useDeleteChatSession(notebookId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const { data: messages } = useMessages(activeSessionId || "");
  const hasMessages = messages && messages.length > 0;

  async function handleCopyChat() {
    if (!hasMessages) return;
    const success = await copyToClipboard(messages);
    if (success) {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    }
  }

  function handleExportMarkdown() {
    if (!hasMessages) return;
    const title = notebook.name || "Chat Export";
    downloadMarkdown(
      messages,
      `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
      title,
    );
  }

  function handleExportPdf() {
    if (!hasMessages) return;
    const title = notebook.name || "Chat Export";
    exportToPdf(messages, title);
  }

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
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Chat"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Configure chat"
              onClick={() => setConfigDialogOpen(true)}
            >
              <SlidersHorizontal />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" title="Chat options">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyChat}
                  disabled={!hasMessages}
                >
                  {exportCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy chat
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportMarkdown}
                  disabled={!hasMessages}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPdf}
                  disabled={!hasMessages}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          </>
        }
      />

      <ChatConfigDialog
        notebook={notebook}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      {sessionsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : activeSessionId ? (
        <ChatContent sessionId={activeSessionId} notebookId={notebookId} />
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
}

function ChatContent({ sessionId, notebookId }: ChatContentProps) {
  // Store state
  const selectedSources = useSelectedSources();
  const pendingMessage = usePendingChatMessage();
  const { highlightCitation, consumePendingChatMessage } = useNotebookActions();
  const { data: messages, isLoading } = useMessages(sessionId);
  const invalidateMessages = useInvalidateMessages(sessionId);
  const invalidateSessions = useInvalidateChatSessions(notebookId);
  const { data: notebookSummary } = useNotebookSummary(notebookId);
  const generateSummary = useGenerateNotebookSummary(notebookId);

  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );
  const [stoppedContent, setStoppedContent] = useState("");
  const [currentSources, setCurrentSources] = useState<SourceInfo[]>([]);
  const [groundingMetadata, setGroundingMetadata] =
    useState<GroundingMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);

  const {
    pushToken,
    renderedContent: streamingContent,
    complete: completeStreamingBuffer,
    reset: resetStreamingBuffer,
    isStreaming: isBufferActive,
  } = useStreamingBuffer(() => {
    setPendingUserMessage(null);
    invalidateMessages();
    invalidateSessions();
    setTimeout(resetStreamingBuffer, 100);
  });

  const {
    sentinelRef,
    containerRef: scrollContainerRef,
    isAtBottom,
    scrollToBottom,
  } = useScrollSentinel({ threshold: 0.1, rootMargin: "50px" });

  // Handle citation click - highlight in sources panel via store
  const handleCitationClick = useCallback(
    (index: number) => {
      if (currentSources.length > 0) {
        const source = currentSources.find((s) => s.citation_index === index);
        if (source) {
          highlightCitation({
            documentId: source.document_id,
            documentName: source.document_name,
            chunkContent: source.content,
            citationIndex: index,
          });
        }
      }
    },
    [currentSources, highlightCitation],
  );

  // Auto-scroll during streaming when user is at bottom
  useEffect(() => {
    if (isBufferActive && isAtBottom) {
      scrollToBottom();
    }
  }, [streamingContent, isBufferActive, isAtBottom, scrollToBottom]);

  // Fetch initial suggested questions when no messages and sources are selected
  useEffect(() => {
    async function fetchInitialSuggestions() {
      if (
        messages &&
        messages.length === 0 &&
        selectedSources.size > 0 &&
        suggestedQuestions.length === 0 &&
        !isLoadingSuggestions
      ) {
        setIsLoadingSuggestions(true);
        try {
          const questions = await getSuggestedQuestions(notebookId);
          setSuggestedQuestions(questions);
        } catch {
          // Silently fail - will show default questions
        } finally {
          setIsLoadingSuggestions(false);
        }
      }
    }
    fetchInitialSuggestions();
  }, [
    messages,
    selectedSources.size,
    notebookId,
    suggestedQuestions.length,
    isLoadingSuggestions,
  ]);

  // Handle cross-panel messages from Studio/Sources
  useEffect(() => {
    if (pendingMessage && !isStreaming && selectedSources.size > 0) {
      const message = consumePendingChatMessage();
      if (message) {
        handleSend(message);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pendingMessage,
    isStreaming,
    selectedSources.size,
    consumePendingChatMessage,
  ]);

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
        case "grounding":
          setGroundingMetadata(event.metadata || null);
          break;
        case "token":
          // Push to buffer instead of direct state update
          pushToken(event.content || "");
          break;
        case "done":
          setIsStreaming(false);
          // Signal buffer to drain - onComplete callback handles invalidation
          completeStreamingBuffer();
          break;
        case "suggestions":
          setSuggestedQuestions(event.questions || []);
          break;
        case "error":
          setError(event.error || "An error occurred");
          setIsStreaming(false);
          resetStreamingBuffer();
          break;
      }
    },
    [pushToken, completeStreamingBuffer, resetStreamingBuffer],
  );

  async function handleSend(retryContent?: string) {
    const content = retryContent || inputValue.trim();
    if (!content || isStreaming) return;

    if (!retryContent) {
      setInputValue("");
    }
    setPendingUserMessage(content);
    setError(null);
    setLastFailedMessage(null);
    setIsStreaming(true);
    resetStreamingBuffer();
    setStoppedContent("");
    setCurrentSources([]);
    setGroundingMetadata(null);
    setSuggestedQuestions([]);
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
          setPendingUserMessage(null);
          invalidateMessages();
          return;
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setLastFailedMessage(content);
        setPendingUserMessage(null);
      }
      setIsStreaming(false);
      resetStreamingBuffer();
    }
  }

  const handleStop = useCallback(() => {
    stoppedByUserRef.current = true;
    setStoppedContent(streamingContent);
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    resetStreamingBuffer();
    setPendingUserMessage(null);
    invalidateMessages();
  }, [streamingContent, resetStreamingBuffer, invalidateMessages]);

  async function handleRegenerate(messageId: string, instruction?: string) {
    setError(null);
    setIsStreaming(true);
    resetStreamingBuffer();
    setStoppedContent("");
    setCurrentSources([]);
    setGroundingMetadata(null);
    stoppedByUserRef.current = false;

    abortControllerRef.current = new AbortController();

    try {
      await regenerateMessage(
        messageId,
        handleEvent,
        abortControllerRef.current.signal,
        instruction,
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
      resetStreamingBuffer();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter to send (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Cmd/Ctrl + Enter also sends
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    // Escape to stop generation
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      handleStop();
    }
    // Arrow up in empty input to populate with last user message
    if (e.key === "ArrowUp" && !inputValue.trim()) {
      const lastUserMessage = allMessages?.findLast((m) => m.role === "user");
      if (lastUserMessage && !isStreaming) {
        e.preventDefault();
        setInputValue(lastUserMessage.content);
      }
    }
  }

  // Global escape key handler (works even when textarea not focused)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isStreaming) {
        e.preventDefault();
        handleStop();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isStreaming, handleStop]);

  async function handleEditMessage(messageId: string, newContent: string) {
    setError(null);
    setIsStreaming(true);
    resetStreamingBuffer();
    setStoppedContent("");
    setCurrentSources([]);
    setGroundingMetadata(null);
    setSuggestedQuestions([]);
    stoppedByUserRef.current = false;

    abortControllerRef.current = new AbortController();

    try {
      await editMessage(
        messageId,
        newContent,
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
        setError(err instanceof Error ? err.message : "Failed to edit message");
      }
      setIsStreaming(false);
      resetStreamingBuffer();
    }
  }

  const allMessages = messages || [];
  const lastAssistantMessage = allMessages.findLast(
    (m) => m.role === "assistant",
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const defaultQuestions = [
    "What are the main topics covered in my sources?",
    "Summarize the key points",
    "What questions can you answer based on my sources?",
  ];

  // Use dynamic suggestions if available, otherwise fall back to defaults
  const displayedQuestions =
    suggestedQuestions.length > 0 ? suggestedQuestions : defaultQuestions;

  function handleSuggestedQuestion(question: string) {
    handleSend(question);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="chat-scroll-container absolute inset-0 overflow-y-auto"
        >
          {allMessages.length === 0 && !isStreaming && !stoppedContent ? (
            selectedSources.size === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant">
                  <Upload className="h-7 w-7 text-on-surface-muted" />
                </div>
                <h2 className="mb-3 text-lg font-medium text-on-surface">
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
              <div className="flex h-full flex-col overflow-y-auto p-8">
                {/* Notebook Summary Card */}
                {notebookSummary?.summary ? (
                  <NotebookSummaryCard
                    summary={notebookSummary}
                    onRegenerate={() => generateSummary.mutate()}
                    isRegenerating={generateSummary.isPending}
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
                      I can help you understand and analyze your{" "}
                      {selectedSources.size} selected source
                      {selectedSources.size !== 1 ? "s" : ""}.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => generateSummary.mutate()}
                      disabled={generateSummary.isPending}
                    >
                      {generateSummary.isPending ? (
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

                {/* Suggested Questions */}
                <div className="mt-auto flex flex-col items-center">
                  <p className="mb-4 text-sm text-on-surface-muted">
                    Try asking:
                  </p>
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
                          onClick={() => handleSuggestedQuestion(question)}
                          className="rounded-full bg-surface-variant px-4 py-2.5 text-sm text-on-surface shadow-sm transition-all duration-200 hover:bg-hover hover:shadow-elevation-1 active:scale-[0.98]"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-6 pb-16 pt-6">
              {allMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  sessionId={sessionId}
                  notebookId={notebookId}
                  sources={
                    message.id === lastAssistantMessage?.id
                      ? currentSources
                      : undefined
                  }
                  onRegenerate={
                    message.role === "assistant" &&
                    message.id === lastAssistantMessage?.id &&
                    !isStreaming
                      ? (instruction?: string) =>
                          handleRegenerate(message.id, instruction)
                      : undefined
                  }
                  showModificationButtons={
                    message.role === "assistant" &&
                    message.id === lastAssistantMessage?.id &&
                    !isStreaming
                  }
                  onCitationClick={handleCitationClick}
                  onEdit={
                    message.role === "user" ? handleEditMessage : undefined
                  }
                  isStreaming={isStreaming}
                />
              ))}
              {pendingUserMessage && (
                <div className="flex flex-row-reverse gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary shadow-elevation-1">
                    U
                  </div>
                  <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3 text-on-primary shadow-elevation-1">
                    <p className="whitespace-pre-wrap text-sm">
                      {pendingUserMessage}
                    </p>
                  </div>
                </div>
              )}
              {streamingContent && (
                <StreamingMessage
                  content={streamingContent}
                  sources={currentSources}
                  groundingMetadata={groundingMetadata}
                  onCitationClick={handleCitationClick}
                />
              )}
              {isStreaming && !streamingContent && <ThinkingIndicator />}
              {!isStreaming && stoppedContent && (
                <StoppedMessage content={stoppedContent} />
              )}
              {/* Follow-up questions after response */}
              {!isStreaming &&
                !stoppedContent &&
                suggestedQuestions.length > 0 &&
                allMessages.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="rounded-full bg-surface-variant px-4 py-2 text-sm text-on-surface shadow-sm transition-all duration-200 hover:bg-hover hover:shadow-elevation-1 active:scale-[0.98]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              <div
                ref={sentinelRef}
                className="scroll-sentinel"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Jump to bottom FAB - shows when user scrolls up */}
          {!isAtBottom && (
            <div className="sticky bottom-4 flex justify-center">
              <Button
                variant="elevated"
                size="sm"
                className="rounded-full shadow-elevation-2"
                onClick={scrollToBottom}
              >
                <ArrowDown className="mr-1.5 h-4 w-4" />
                Jump to bottom
              </Button>
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface/90 to-transparent"
          aria-hidden="true"
        />
      </div>

      {error && (
        <div className="bg-destructive-muted p-3 text-center text-sm text-on-destructive-muted">
          <span>{error}</span>
          {lastFailedMessage && (
            <Button
              variant="link"
              size="sm"
              className="ml-2 h-auto p-0 font-medium"
              onClick={() => handleSend(lastFailedMessage!)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
          <Button
            variant="link"
            size="sm"
            className="ml-2 h-auto p-0"
            onClick={() => {
              setError(null);
              setLastFailedMessage(null);
            }}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="shrink-0 bg-surface/80 px-4 pb-2 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-[28px] border border-border bg-surface-variant px-5 py-3 shadow-elevation-1 transition-all duration-200 focus-within:border-primary focus-within:shadow-elevation-2">
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
              className="flex-1 resize-none bg-transparent py-1 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none"
              rows={1}
              disabled={isStreaming || selectedSources.size === 0}
            />
            <span className="shrink-0 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-on-surface-muted">
              {selectedSources.size} sources
            </span>
            {isStreaming ? (
              <Button
                size="icon"
                variant="destructive"
                className="h-10 w-10 shrink-0 rounded-full shadow-elevation-1"
                onClick={handleStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="filled"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || selectedSources.size === 0}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 pb-3 pt-2 text-center">
        <p className="text-xs text-on-surface-subtle">
          ONotebook may make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}

interface NotebookSummaryCardProps {
  summary: NotebookSummary;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function NotebookSummaryCard({
  summary,
  onRegenerate,
  isRegenerating,
}: NotebookSummaryCardProps) {
  // Highlight key terms in the summary text
  function highlightKeyTerms(
    text: string,
    keyTerms: string[],
  ): React.ReactNode {
    if (!keyTerms.length) return text;

    // Sort by length (longest first) to avoid partial matches
    const sortedTerms = [...keyTerms].sort((a, b) => b.length - a.length);
    const escapedTerms = sortedTerms.map((term) =>
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const pattern = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");

    const parts = text.split(pattern);
    return parts.map((part, i) => {
      const isKeyTerm = keyTerms.some(
        (term) => term.toLowerCase() === part.toLowerCase(),
      );
      return isKeyTerm ? <strong key={i}>{part}</strong> : part;
    });
  }

  return (
    <div className="mb-6 rounded-lg bg-surface-variant p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-on-surface">Notebook Summary</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="h-8 text-xs"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin text-on-surface-muted" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 h-3 w-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>
      <div className="prose prose-sm max-w-none ">
        <p>
          {highlightKeyTerms(summary.summary || "", summary.key_terms || [])}
        </p>
      </div>
      {summary.key_terms && summary.key_terms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.key_terms.map((term) => (
            <span
              key={term}
              className="rounded-full bg-primary-muted px-3 py-1 text-xs font-medium text-on-primary-muted"
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
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
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted">
          <Bot className="h-7 w-7 text-on-primary-muted" />
        </div>
        <h2 className="mb-3 text-lg font-medium text-on-surface">
          Ready to chat
        </h2>
        <p className="mb-4 text-sm text-on-surface-muted">
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-variant">
        <Upload className="h-6 w-6 text-on-surface-muted" />
      </div>
      <h2 className="mb-3 text-lg font-medium text-on-surface">
        Add a source to get started
      </h2>
      <Button variant="outline" className="rounded-full">
        Upload a source
      </Button>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  sessionId: string;
  notebookId: string;
  sources?: SourceInfo[];
  onRegenerate?: (instruction?: string) => void;
  showModificationButtons?: boolean;
  onCitationClick?: (index: number) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  isStreaming?: boolean;
}

function MessageBubble({
  message,
  sessionId,
  notebookId,
  sources,
  onRegenerate,
  showModificationButtons,
  onCitationClick,
  onEdit,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showAllCitations, setShowAllCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackMutation = useMessageFeedback(sessionId);
  const createNote = useCreateNote(notebookId);

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
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
    // Toggle off if clicking the same rating
    const feedback = message.feedback === newRating ? null : newRating;
    feedbackMutation.mutate({ messageId: message.id, feedback });
  }

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-elevation-1",
          isUser
            ? "bg-primary text-on-primary"
            : "bg-surface-variant text-on-surface",
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
        {/* User message - edit mode */}
        {isUser && isEditing ? (
          <div className="w-full max-w-md">
            <textarea
              ref={editTextareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={1}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8"
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={handleSaveEdit}
                disabled={
                  !editContent.trim() || editContent === message.content
                }
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
        ) : (
          <div
            className={cn(
              "group inline-block rounded-2xl px-4 py-3",
              isUser
                ? "bg-primary-muted text-on-primary-muted shadow-elevation-1"
                : "text-on-surface",
            )}
          >
            <div className="prose prose-sm max-w-none ">
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
            {/* Edit button for user messages */}
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
              <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
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
                  className={cn("h-7 w-7", message.feedback === "up" && "")}
                  onClick={() => handleRate("up")}
                  title="Good response"
                  disabled={feedbackMutation.isPending}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", message.feedback === "down" && "")}
                  onClick={() => handleRate("down")}
                  title="Bad response"
                  disabled={feedbackMutation.isPending}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", saved && "")}
                  onClick={handleSaveToNote}
                  title="Save to note"
                  disabled={createNote.isPending || saved}
                >
                  {saved ? (
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
                    onClick={() => onRegenerate()}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </Button>
                )}
              </div>
            )}
            {/* Modification buttons - Gemini-style */}
            {!isUser && showModificationButtons && onRegenerate && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    onRegenerate("Make your response shorter and more concise.")
                  }
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-hover hover:shadow-sm active:scale-[0.98]"
                >
                  Shorter
                </button>
                <button
                  onClick={() =>
                    onRegenerate(
                      "Make your response longer with more detail and examples.",
                    )
                  }
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-hover hover:shadow-sm active:scale-[0.98]"
                >
                  Longer
                </button>
                <button
                  onClick={() =>
                    onRegenerate(
                      "Make your response simpler and easier to understand. Use plain language.",
                    )
                  }
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-hover hover:shadow-sm active:scale-[0.98]"
                >
                  Simpler
                </button>
                <button
                  onClick={() =>
                    onRegenerate(
                      "Make your response more detailed with technical depth and thoroughness.",
                    )
                  }
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-all hover:bg-hover hover:shadow-sm active:scale-[0.98]"
                >
                  More detailed
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
  sources?: SourceInfo[];
  groundingMetadata?: GroundingMetadata | null;
  onCitationClick?: (index: number) => void;
}

function StreamingMessage({
  content,
  sources,
  groundingMetadata,
  onCitationClick,
}: StreamingMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lockedMinHeight, setLockedMinHeight] = useState<number | null>(null);

  // Lock height to prevent layout shifts - only grow, never shrink during streaming
  useEffect(() => {
    if (containerRef.current) {
      const currentHeight = containerRef.current.scrollHeight;
      setLockedMinHeight((prev) =>
        prev === null ? currentHeight : Math.max(prev, currentHeight),
      );
    }
  }, [content]);

  // Check if this is a refusal response based on grounding metadata or content
  const isRefusal =
    (groundingMetadata && !groundingMetadata.has_relevant_sources) ||
    isRefusalResponse(content);

  if (isRefusal && content.length > 50) {
    return <RefusalMessage content={content} />;
  }

  return (
    <div className="streaming-message-container flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div
        ref={containerRef}
        className="streaming-bubble-active flex-1"
        style={{ minHeight: lockedMinHeight ?? undefined }}
      >
        <div className="prose prose-sm max-w-none ">
          <MemoizedMarkdown
            content={content}
            onCitationClick={onCitationClick}
            sources={sources}
          />
        </div>
        {groundingMetadata && groundingMetadata.has_relevant_sources && (
          <div className="mt-2">
            <ConfidenceBadge metadata={groundingMetadata} />
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-variant px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite] rounded-full bg-on-surface-muted" />
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite_0.2s] rounded-full bg-on-surface-muted" />
          <span className="h-2 w-2 animate-[typing-dots_1.4s_ease-in-out_infinite_0.4s] rounded-full bg-on-surface-muted" />
        </div>
        <span className="text-sm text-on-surface-muted">
          Searching your sources...
        </span>
      </div>
    </div>
  );
}

function StoppedMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="prose prose-sm max-w-none ">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <div className="mt-2 text-xs italic text-on-surface-muted">
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
        className="absolute right-2 top-2 rounded bg-surface-variant p-1.5 text-on-surface opacity-0 transition-opacity hover:bg-hover group-hover/code:opacity-100"
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
  source?: SourceInfo;
  onClick: (index: number) => void;
}

function CitationButton({ index, source, onClick }: CitationButtonProps) {
  const button = (
    <button
      onClick={() => onClick(index)}
      className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-muted px-2 text-xs font-semibold text-on-primary-muted shadow-sm transition-all duration-150 hover:shadow-elevation-1 active:scale-95"
    >
      {index}
    </button>
  );

  if (source) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{button}</HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-80 rounded-xl border border-outline-variant bg-surface p-0 shadow-elevation-2"
        >
          <div className="border-b border-outline-variant px-3 py-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-on-surface-muted" />
              <span className="truncate text-sm font-medium text-on-surface">
                {source.document_name}
              </span>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="line-clamp-4 text-xs leading-relaxed text-on-surface-muted">
              {source.content}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant px-3 py-2">
            <span className="text-xs text-on-surface-subtle">
              Relevance: {Math.round(source.relevance_score * 100)}%
            </span>
            <span className="text-xs text-primary">
              Click to view in source
            </span>
          </div>
        </HoverCardContent>
      </HoverCard>
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
      className="mx-0.5 inline-flex h-5 items-center justify-center rounded-full bg-surface-variant px-2 text-xs font-medium text-on-surface-muted transition-colors hover:bg-hover"
    >
      +{count} more
    </button>
  );
}

function ConfidenceBadge({ metadata }: { metadata: GroundingMetadata }) {
  const { confidence_score, sources_used, avg_relevance, sources_filtered } =
    metadata;

  const isHigh = confidence_score >= 0.6;
  const isMedium = confidence_score >= 0.35;

  const badgeClass = isHigh
    ? "bg-success-muted text-on-success-muted"
    : isMedium
      ? "bg-warning-muted text-on-warning-muted"
      : "bg-destructive-muted text-on-destructive-muted";

  const label = isHigh
    ? "Well grounded"
    : isMedium
      ? "Partially grounded"
      : "Limited sources";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>
          Based on {sources_used} source{sources_used !== 1 ? "s" : ""}
        </p>
        <p>Average relevance: {Math.round(avg_relevance * 100)}%</p>
        {sources_filtered > 0 && (
          <p className="text-on-surface-subtle">
            {sources_filtered} low-relevance source
            {sources_filtered !== 1 ? "s" : ""} filtered
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function RefusalMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-muted text-on-warning-muted shadow-elevation-1">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="rounded-2xl border border-warning bg-warning-muted px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-warning-muted">
              Cannot Answer From Sources
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-on-warning-muted">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        <p className="mt-2 text-xs text-on-surface-muted">
          Try rephrasing your question or adding more relevant sources.
        </p>
      </div>
    </div>
  );
}

function isRefusalResponse(content: string): boolean {
  const text = content.slice(0, 300).toLowerCase();
  return (
    text.includes("cannot answer this question based on") ||
    text.includes("don't contain information") ||
    text.includes("documents don't contain") ||
    text.includes("no relevant information")
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
          source={source}
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
