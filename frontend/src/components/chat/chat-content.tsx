"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, ArrowDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { useMessages } from "@/hooks/use-chat";
import { useScrollSentinel } from "@/hooks/use-scroll-sentinel";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  useNotebookSummary,
  useGenerateNotebookSummary,
} from "@/hooks/use-notebooks";
import { getSuggestedQuestions } from "@/lib/api";
import {
  useSelectedSources,
  usePendingChatMessage,
  useNotebookActions,
} from "@/stores/notebook-store";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatReadyState } from "./chat-ready-state";
import { ChatMessagesView } from "./chat-messages-view";
import { ChatInputArea, ChatInputAreaHandle } from "./chat-input-area";
import { ChatErrorBanner } from "./chat-error-banner";

interface ChatContentProps {
  sessionId: string;
  notebookId: string;
}

export function ChatContent({ sessionId, notebookId }: ChatContentProps) {
  const selectedSources = useSelectedSources();
  const pendingMessage = usePendingChatMessage();
  const { highlightCitation, consumePendingChatMessage, requestAddSources } =
    useNotebookActions();
  const { data: messages, isLoading } = useMessages(sessionId);
  const { data: notebookSummary } = useNotebookSummary(notebookId);
  const generateSummary = useGenerateNotebookSummary(notebookId);

  const [inputValue, setInputValue] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(20);
  const inputAreaRef = useRef<ChatInputAreaHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allMessages = messages || [];
  const hasMoreMessages = allMessages.length > visibleMessageCount;
  const visibleMessages = hasMoreMessages
    ? allMessages.slice(-visibleMessageCount)
    : allMessages;

  const {
    streaming,
    error,
    suggestions,
    pendingUserMessage,
    stoppedContent,
    handlers,
  } = useChatStream({
    sessionId,
    notebookId,
    selectedSources,
  });

  const {
    sentinelRef,
    containerRef: scrollContainerRef,
    isAtBottom,
    scrollToBottom,
  } = useScrollSentinel({ threshold: 0.1, rootMargin: "50px" });

  const handleCitationClick = useCallback(
    (index: number) => {
      if (streaming.sources.length > 0) {
        const source = streaming.sources.find(
          (s) => s.citation_index === index,
        );
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
    [streaming.sources, highlightCitation],
  );

  // Auto-scroll during streaming
  useEffect(() => {
    if (streaming.isBufferActive && isAtBottom) {
      scrollToBottom();
    }
  }, [streaming.content, streaming.isBufferActive, isAtBottom, scrollToBottom]);

  // Fetch initial suggested questions
  useEffect(() => {
    async function fetchInitialSuggestions() {
      if (
        messages &&
        messages.length === 0 &&
        selectedSources.size > 0 &&
        suggestions.questions.length === 0 &&
        !isLoadingSuggestions
      ) {
        setIsLoadingSuggestions(true);
        try {
          const questions = await getSuggestedQuestions(notebookId);
          suggestions.setQuestions(questions);
        } catch {
          // Silently fail
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
    suggestions.questions.length,
    suggestions.setQuestions,
    isLoadingSuggestions,
  ]);

  // Handle cross-panel messages
  useEffect(() => {
    if (pendingMessage && !streaming.isActive && selectedSources.size > 0) {
      const message = consumePendingChatMessage();
      if (message) {
        handlers.send(message);
      }
    }
  }, [
    pendingMessage,
    streaming.isActive,
    selectedSources.size,
    consumePendingChatMessage,
    handlers,
  ]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Escape - stop streaming
      if (e.key === "Escape" && streaming.isActive) {
        e.preventDefault();
        handlers.stop();
        return;
      }

      // Cmd/Ctrl+K - focus input
      if (isMod && e.key === "k") {
        e.preventDefault();
        inputAreaRef.current?.focus();
        return;
      }

      // Cmd/Ctrl+Shift+C - copy last response
      if (isMod && e.shiftKey && e.key === "c") {
        const lastAssistant = allMessages.findLast(
          (m) => m.role === "assistant",
        );
        if (lastAssistant) {
          e.preventDefault();
          navigator.clipboard.writeText(lastAssistant.content);
          showToast("Copied last response", "success");
        }
        return;
      }

      // Cmd/Ctrl+F - open search
      if (isMod && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [streaming.isActive, handlers, allMessages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && streaming.isActive) {
      e.preventDefault();
      handlers.stop();
    }
    if (e.key === "ArrowUp" && !inputValue.trim()) {
      const lastUserMessage = allMessages?.findLast((m) => m.role === "user");
      if (lastUserMessage && !streaming.isActive) {
        e.preventDefault();
        setInputValue(lastUserMessage.content);
      }
    }
  }

  function handleSend() {
    if (!inputValue.trim() || streaming.isActive) return;
    handlers.send(inputValue);
    setInputValue("");
  }

  function handleSuggestedQuestion(question: string) {
    handlers.send(question);
  }

  function handleLoadMoreMessages() {
    setVisibleMessageCount((prev) => prev + 20);
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const showEmptyState =
    allMessages.length === 0 && !streaming.isActive && !stoppedContent;
  const showReadyState = showEmptyState && selectedSources.size > 0;
  const showUploadPrompt = showEmptyState && selectedSources.size === 0;
  const showMessages = !showEmptyState;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isSearchOpen && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2">
          <Search className="h-4 w-4 text-on-surface-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsSearchOpen(false);
                setSearchQuery("");
              }
            }}
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-muted outline-none"
          />
          {searchQuery && (
            <span className="text-xs text-on-surface-muted">
              {
                allMessages.filter((m) =>
                  m.content.toLowerCase().includes(searchQuery.toLowerCase()),
                ).length
              }{" "}
              matches
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="chat-scroll-container absolute inset-0 overflow-y-auto"
        >
          {showUploadPrompt && (
            <ChatEmptyState onRequestAddSources={requestAddSources} />
          )}
          {showReadyState && (
            <ChatReadyState
              selectedSourcesCount={selectedSources.size}
              notebookSummary={notebookSummary}
              onGenerateSummary={() => generateSummary.mutate()}
              isGeneratingSummary={generateSummary.isPending}
              suggestedQuestions={suggestions.questions}
              isLoadingSuggestions={isLoadingSuggestions}
              onQuestionClick={handleSuggestedQuestion}
            />
          )}
          {showMessages && (
            <ChatMessagesView
              ref={sentinelRef}
              messages={visibleMessages}
              sessionId={sessionId}
              notebookId={notebookId}
              currentSources={streaming.sources}
              isStreaming={streaming.isActive}
              streamingContent={streaming.content}
              groundingMetadata={streaming.grounding}
              pendingUserMessage={pendingUserMessage}
              stoppedContent={stoppedContent}
              suggestedQuestions={suggestions.questions}
              streamingStage={streaming.stage}
              searchQuery={searchQuery}
              hasMoreMessages={hasMoreMessages}
              onCitationClick={handleCitationClick}
              onRegenerate={handlers.regenerate}
              onEdit={handlers.edit}
              onQuestionClick={handleSuggestedQuestion}
              onContinue={handlers.continueGenerating}
              onLoadMore={handleLoadMoreMessages}
            />
          )}

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

      {error.message && (
        <ChatErrorBanner
          error={error.message}
          canRetry={!!error.lastFailed}
          onRetry={error.retry}
          onDismiss={error.dismiss}
        />
      )}

      <ChatInputArea
        ref={inputAreaRef}
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={handlers.stop}
        onKeyDown={handleKeyDown}
        isStreaming={streaming.isActive}
        selectedSourcesCount={selectedSources.size}
        disabled={streaming.isActive || selectedSources.size === 0}
      />
      <div className="shrink-0 pb-3 pt-2 text-center">
        <p className="text-xs text-on-surface-subtle">
          ONotebook may make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
