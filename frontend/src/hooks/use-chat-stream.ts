import { useState, useRef, useCallback, useEffect } from "react";
import { useStreamingBuffer } from "@/hooks/use-streaming-buffer";
import {
  useInvalidateMessages,
  useInvalidateChatSessions,
} from "@/hooks/use-chat";
import { sendMessage, regenerateMessage, editMessage } from "@/lib/api";
import type {
  SourceInfo,
  StreamEvent,
  GroundingMetadata,
  StreamingStage,
} from "@/types/api";

interface UseChatStreamOptions {
  sessionId: string;
  notebookId: string;
  selectedSources: Set<string>;
}

export function useChatStream({
  sessionId,
  notebookId,
  selectedSources,
}: UseChatStreamOptions) {
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<StreamingStage | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);
  const resetBufferRef = useRef<(() => void) | null>(null);

  const invalidateMessages = useInvalidateMessages(sessionId);
  const invalidateSessions = useInvalidateChatSessions(notebookId);

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
    setTimeout(() => resetBufferRef.current?.(), 100);
  });

  useEffect(() => {
    resetBufferRef.current = resetStreamingBuffer;
  }, [resetStreamingBuffer]);

  const handleEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "stage":
          setCurrentStage(event.stage || null);
          break;
        case "sources":
          setCurrentSources(event.sources || []);
          break;
        case "grounding":
          setGroundingMetadata(event.metadata || null);
          break;
        case "token":
          pushToken(event.content || "");
          break;
        case "done":
          setIsStreaming(false);
          setCurrentStage(null);
          completeStreamingBuffer();
          break;
        case "suggestions":
          setSuggestedQuestions(event.questions || []);
          break;
        case "error":
          setError(event.error || "An error occurred");
          setIsStreaming(false);
          setCurrentStage(null);
          resetStreamingBuffer();
          break;
      }
    },
    [pushToken, completeStreamingBuffer, resetStreamingBuffer],
  );

  const resetStreamState = useCallback(() => {
    resetStreamingBuffer();
    setStoppedContent("");
    setCurrentSources([]);
    setGroundingMetadata(null);
    setCurrentStage(null);
    stoppedByUserRef.current = false;
  }, [resetStreamingBuffer]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setPendingUserMessage(content);
      setError(null);
      setLastFailedMessage(null);
      setIsStreaming(true);
      resetStreamState();
      setSuggestedQuestions([]);

      abortControllerRef.current = new AbortController();
      const documentIds =
        selectedSources.size > 0 ? Array.from(selectedSources) : undefined;

      try {
        await sendMessage(
          sessionId,
          content,
          null,
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
          setError(
            err instanceof Error ? err.message : "Failed to send message",
          );
          setLastFailedMessage(content);
          setPendingUserMessage(null);
        }
        setIsStreaming(false);
        resetStreamingBuffer();
      }
    },
    [
      isStreaming,
      sessionId,
      selectedSources,
      handleEvent,
      resetStreamState,
      resetStreamingBuffer,
      invalidateMessages,
    ],
  );

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    setStoppedContent(streamingContent);
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setCurrentStage(null);
    resetStreamingBuffer();
    setPendingUserMessage(null);
    invalidateMessages();
  }, [streamingContent, resetStreamingBuffer, invalidateMessages]);

  const regenerate = useCallback(
    async (messageId: string, instruction?: string) => {
      setError(null);
      setIsStreaming(true);
      resetStreamState();

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
    },
    [handleEvent, resetStreamState, resetStreamingBuffer, invalidateMessages],
  );

  const edit = useCallback(
    async (messageId: string, newContent: string) => {
      setError(null);
      setIsStreaming(true);
      resetStreamState();
      setSuggestedQuestions([]);

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
          setError(
            err instanceof Error ? err.message : "Failed to edit message",
          );
        }
        setIsStreaming(false);
        resetStreamingBuffer();
      }
    },
    [handleEvent, resetStreamState, resetStreamingBuffer, invalidateMessages],
  );

  const continueGenerating = useCallback(async () => {
    if (isStreaming) return;
    const continuePrompt = "Please continue from where you left off.";
    await send(continuePrompt);
  }, [isStreaming, send]);

  const dismissError = useCallback(() => {
    setError(null);
    setLastFailedMessage(null);
  }, []);

  const retry = useCallback(() => {
    if (lastFailedMessage) {
      send(lastFailedMessage);
    }
  }, [lastFailedMessage, send]);

  return {
    streaming: {
      isActive: isStreaming,
      content: streamingContent,
      sources: currentSources,
      grounding: groundingMetadata,
      isBufferActive,
      stage: currentStage,
    },
    error: {
      message: error,
      lastFailed: lastFailedMessage,
      dismiss: dismissError,
      retry,
    },
    suggestions: {
      questions: suggestedQuestions,
      setQuestions: setSuggestedQuestions,
    },
    pendingUserMessage,
    stoppedContent,
    handlers: {
      send,
      stop,
      regenerate,
      edit,
      continueGenerating,
    },
  };
}
