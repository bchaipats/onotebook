"use client";

import { memo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CodeBlockProps {
  language?: string;
  children: string;
}

export const CodeBlock = memo(function CodeBlock({
  language,
  children,
}: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="group/code relative">
      <button
        onClick={() => copy(children)}
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
});
