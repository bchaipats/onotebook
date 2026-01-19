"use client";

import ReactMarkdown from "react-markdown";
import { AlertCircle } from "lucide-react";

interface RefusalMessageProps {
  content: string;
}

export function RefusalMessage({ content }: RefusalMessageProps) {
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
