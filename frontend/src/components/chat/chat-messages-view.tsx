"use client";

import { forwardRef } from "react";
import { MessageBubble } from "./message-bubble";
import { StreamingMessage } from "./streaming-message";
import { ThinkingIndicator } from "./thinking-indicator";
import { StoppedMessage } from "./stopped-message";
import type { ChatMessage, SourceInfo, GroundingMetadata } from "@/types/api";

interface ChatMessagesViewProps {
  messages: ChatMessage[];
  sessionId: string;
  notebookId: string;
  currentSources: SourceInfo[];
  isStreaming: boolean;
  streamingContent: string;
  groundingMetadata: GroundingMetadata | null;
  pendingUserMessage: string | null;
  stoppedContent: string;
  suggestedQuestions: string[];
  onCitationClick: (index: number) => void;
  onRegenerate: (messageId: string, instruction?: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onQuestionClick: (question: string) => void;
}

export const ChatMessagesView = forwardRef<
  HTMLDivElement,
  ChatMessagesViewProps
>(function ChatMessagesView(
  {
    messages,
    sessionId,
    notebookId,
    currentSources,
    isStreaming,
    streamingContent,
    groundingMetadata,
    pendingUserMessage,
    stoppedContent,
    suggestedQuestions,
    onCitationClick,
    onRegenerate,
    onEdit,
    onQuestionClick,
  },
  sentinelRef,
) {
  const lastAssistantMessage = messages.findLast((m) => m.role === "assistant");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-16 pt-6">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          sessionId={sessionId}
          notebookId={notebookId}
          sources={
            message.id === lastAssistantMessage?.id ? currentSources : undefined
          }
          onRegenerate={
            message.role === "assistant" &&
            message.id === lastAssistantMessage?.id &&
            !isStreaming
              ? (instruction?: string) => onRegenerate(message.id, instruction)
              : undefined
          }
          showModificationButtons={
            message.role === "assistant" &&
            message.id === lastAssistantMessage?.id &&
            !isStreaming
          }
          onCitationClick={onCitationClick}
          onEdit={message.role === "user" ? onEdit : undefined}
          isStreaming={isStreaming}
        />
      ))}
      {pendingUserMessage && (
        <div className="flex flex-row-reverse gap-4">
          <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3 text-on-primary shadow-elevation-1">
            <p className="whitespace-pre-wrap text-sm">{pendingUserMessage}</p>
          </div>
        </div>
      )}
      {streamingContent && (
        <StreamingMessage
          content={streamingContent}
          sources={currentSources}
          groundingMetadata={groundingMetadata}
          onCitationClick={onCitationClick}
        />
      )}
      {isStreaming && !streamingContent && <ThinkingIndicator />}
      {!isStreaming && stoppedContent && (
        <StoppedMessage content={stoppedContent} />
      )}
      {!isStreaming &&
        !stoppedContent &&
        suggestedQuestions.length > 0 &&
        messages.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => onQuestionClick(question)}
                className="rounded-full bg-surface-variant px-4 py-2 text-sm text-on-surface shadow-sm transition-colors duration-200 hover:bg-hover"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />
    </div>
  );
});
