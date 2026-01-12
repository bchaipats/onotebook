"use client";

import React, { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { SourceInfo } from "@/types/api";
import { Copy, Check } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const REMARK_PLUGINS = [remarkGfm];

interface MemoizedMarkdownProps {
  content: string;
  onCitationClick?: (index: number) => void;
  sources?: SourceInfo[];
}

export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  content,
  onCitationClick,
  sources,
}: MemoizedMarkdownProps) {
  const components = useMemo(
    () => ({
      code({
        className,
        children,
      }: {
        className?: string;
        children?: React.ReactNode;
      }) {
        const match = /language-(\w+)/.exec(className || "");
        if (!match && !className) {
          return <code className={className}>{children}</code>;
        }
        return (
          <CodeBlock language={match?.[1]}>
            {String(children).replace(/\n$/, "")}
          </CodeBlock>
        );
      },
      p({ children }: { children?: React.ReactNode }) {
        if (!onCitationClick) return <p>{children}</p>;
        return <p>{processChildren(children, onCitationClick, sources)}</p>;
      },
      li({ children }: { children?: React.ReactNode }) {
        if (!onCitationClick) return <li>{children}</li>;
        return <li>{processChildren(children, onCitationClick, sources)}</li>;
      },
    }),
    [onCitationClick, sources],
  );

  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
      {content}
    </ReactMarkdown>
  );
});

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

function CitationButton({
  index,
  source,
  onClick,
}: {
  index: number;
  source?: SourceInfo;
  onClick: (index: number) => void;
}) {
  const button = (
    <button
      onClick={() => onClick(index)}
      className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-muted px-2 text-xs font-semibold text-on-primary-muted shadow-sm transition-all duration-150 hover:shadow-elevation-1 active:scale-95"
    >
      {index}
    </button>
  );

  if (!source) return button;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{button}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="z-50 w-80 overflow-hidden rounded-xl border border-border bg-surface p-0 shadow-elevation-2"
      >
        <div className="bg-surface-variant px-3 py-2">
          <p className="line-clamp-1 text-sm font-medium text-on-surface">
            {source.document_name}
          </p>
        </div>
        <div className="max-h-40 overflow-y-auto p-3">
          <p className="text-sm leading-relaxed text-on-surface-muted">
            {source.content.slice(0, 300)}
            {source.content.length > 300 && "..."}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function processChildren(
  children: React.ReactNode,
  onCitationClick: (index: number) => void,
  sources?: SourceInfo[],
): React.ReactNode {
  return React.Children.map(children, (child, idx) => {
    if (typeof child !== "string") return child;

    const parts: React.ReactNode[] = [];
    const citationRegex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(child)) !== null) {
      if (match.index > lastIndex) {
        parts.push(child.slice(lastIndex, match.index));
      }
      const citationIndex = parseInt(match[1], 10);
      parts.push(
        <CitationButton
          key={`citation-${match.index}`}
          index={citationIndex}
          source={sources?.find((s) => s.citation_index === citationIndex)}
          onClick={onCitationClick}
        />,
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < child.length) {
      parts.push(child.slice(lastIndex));
    }

    return parts.length > 1 ? (
      <React.Fragment key={idx}>{parts}</React.Fragment>
    ) : (
      child
    );
  });
}
