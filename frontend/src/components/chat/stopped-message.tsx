"use client";

import ReactMarkdown from "react-markdown";
import { Bot } from "lucide-react";

interface StoppedMessageProps {
  content: string;
}

export function StoppedMessage({ content }: StoppedMessageProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface shadow-elevation-1">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <div className="mt-2 text-xs italic text-on-surface-muted">
          Generation stopped
        </div>
      </div>
    </div>
  );
}
