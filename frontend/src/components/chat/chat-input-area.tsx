"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Square, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChatInputAreaHandle {
  focus: () => void;
}

interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isStreaming: boolean;
  selectedSourcesCount: number;
  disabled: boolean;
}

export const ChatInputArea = forwardRef<
  ChatInputAreaHandle,
  ChatInputAreaProps
>(function ChatInputArea(
  {
    value,
    onChange,
    onSend,
    onStop,
    onKeyDown,
    isStreaming,
    selectedSourcesCount,
    disabled,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const adjustHeight = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    const maxHeight = Math.floor(window.innerHeight * 0.4);
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    window.addEventListener("resize", adjustHeight);
    return () => window.removeEventListener("resize", adjustHeight);
  }, [adjustHeight]);

  return (
    <div className="shrink-0 bg-surface/80 px-4 pb-2 pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 rounded-[28px] border border-border bg-surface-variant px-5 py-3 shadow-elevation-1 transition-all duration-200 focus-within:border-primary focus-within:shadow-elevation-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              selectedSourcesCount === 0
                ? "Upload a source to get started"
                : "Ask about your sources..."
            }
            className="flex-1 resize-none bg-transparent py-1 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none"
            rows={1}
            disabled={disabled}
          />
          <span className="shrink-0 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-on-surface-muted">
            {selectedSourcesCount} sources
          </span>
          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-10 w-10 shrink-0 rounded-full shadow-elevation-1"
              onClick={onStop}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="filled"
              className="h-10 w-10 shrink-0 rounded-full"
              onClick={onSend}
              disabled={!value.trim() || selectedSourcesCount === 0}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
