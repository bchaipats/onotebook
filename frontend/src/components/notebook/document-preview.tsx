"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { FileText, Hash, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getChunks, getDocumentFileUrl } from "@/lib/api";
import type { Document, Chunk } from "@/types/api";

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  ),
});

interface DocumentPreviewProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreview({
  document,
  open,
  onClose,
}: DocumentPreviewProps) {
  const { data: chunks, isLoading } = useQuery({
    queryKey: ["chunks", document?.id],
    queryFn: () => getChunks(document!.id),
    enabled: !!document && open,
  });

  const isPdf = document?.file_type === "pdf";
  const isMarkdown =
    document?.file_type === "md" || document?.file_type === "markdown";

  const fullContent = chunks
    ?.sort((a, b) => a.chunk_index - b.chunk_index)
    .map((chunk) => chunk.content)
    .join("\n\n");

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 pr-8">
            <FileText className="h-5 w-5" />
            <SheetTitle className="truncate">{document?.filename}</SheetTitle>
          </div>
          {document && (
            <div className="flex items-center gap-2 text-xs">
              <span>{formatFileSize(document.file_size)}</span>
              <span>|</span>
              <span>{document.chunk_count} chunks</span>
              {document.page_count && (
                <>
                  <span>|</span>
                  <span>{document.page_count} pages</span>
                </>
              )}
            </div>
          )}
        </SheetHeader>

        <Tabs
          defaultValue="preview"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="chunks">Chunks</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto">
            {isPdf && document ? (
              <PDFViewer url={getDocumentFileUrl(document.id)} />
            ) : isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : fullContent ? (
              <div className="p-4">
                {isMarkdown ? (
                  <div className="markdown-preview">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="mb-4 mt-6 text-2xl font-bold">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-3 mt-5 text-xl font-semibold">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mb-2 mt-4 text-lg font-semibold">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-3 list-disc pl-6">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-3 list-decimal pl-6">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        code: ({ children }) => (
                          <code className="rounded px-1.5 py-0.5 font-mono text-sm">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="mb-3 overflow-x-auto rounded-md p-3 font-mono text-sm">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="mb-3 pl-4 italic">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                      }}
                    >
                      {fullContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {fullContent}
                  </pre>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-on-surface-muted" />
                <p className="text-on-surface-muted">No content available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chunks" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : chunks && chunks.length > 0 ? (
              <div className="space-y-3 p-4">
                {chunks
                  .sort((a, b) => a.chunk_index - b.chunk_index)
                  .map((chunk) => (
                    <ChunkCard key={chunk.id} chunk={chunk} />
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Hash className="mb-2 h-8 w-8 text-on-surface-muted" />
                <p className="text-on-surface-muted">No chunks available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

interface ChunkCardProps {
  chunk: Chunk;
}

function ChunkCard({ chunk }: ChunkCardProps) {
  return (
    <div className="rounded-md p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Chunk #{chunk.chunk_index + 1}</span>
        <div className="flex items-center gap-2">
          <span>{chunk.token_count} tokens</span>
          {chunk.page_number && <span>Page {chunk.page_number}</span>}
        </div>
      </div>
      <p className="text-sm leading-relaxed">{chunk.content}</p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
