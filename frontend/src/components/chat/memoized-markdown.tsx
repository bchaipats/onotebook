"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SourceInfo } from "@/types/api";
import { CodeBlock } from "./code-block";
import { CitationButton } from "./citation-button";
import { processChildren } from "@/lib/citation-utils";

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
  const components = useMemo(() => {
    const renderCitation = (
      index: number,
      source: SourceInfo | undefined,
      key: string,
    ) => (
      <CitationButton
        key={key}
        index={index}
        source={source}
        onClick={onCitationClick!}
      />
    );

    return {
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
        return (
          <p>
            {processChildren({
              children,
              sources,
              renderCitation,
            })}
          </p>
        );
      },
      li({ children }: { children?: React.ReactNode }) {
        if (!onCitationClick) return <li>{children}</li>;
        return (
          <li>
            {processChildren({
              children,
              sources,
              renderCitation,
            })}
          </li>
        );
      },
    };
  }, [onCitationClick, sources]);

  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
      {content}
    </ReactMarkdown>
  );
});
