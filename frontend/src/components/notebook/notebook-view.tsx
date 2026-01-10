"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Eye,
  MessageSquare,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useRetryProcessing,
} from "@/hooks/use-documents";
import type { ChatSession, Document, Notebook } from "@/types/api";
import { DocumentPreview } from "./document-preview";
import { ChatView } from "@/components/chat/chat-view";
import { ChatSessionList } from "@/components/chat/chat-session-list";
import { ModelSelector } from "@/components/chat/model-selector";
import { useSettings } from "@/hooks/use-settings";

const ALLOWED_FILE_TYPES = [".pdf", ".txt", ".md", ".docx", ".html"];

interface NotebookViewProps {
  notebook: Notebook;
}

export function NotebookView({ notebook }: NotebookViewProps) {
  const { data: documents, isLoading } = useDocuments(notebook.id);
  const { data: settings } = useSettings();
  const uploadDocument = useUploadDocument(notebook.id);
  const deleteDocument = useDeleteDocument(notebook.id);
  const retryProcessing = useRetryProcessing(notebook.id);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documents");
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected model from settings when loaded
  const effectiveModel = selectedModel || settings?.default_model || null;

  function validateFile(file: File): string | null {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      return `Invalid file type: ${ext}. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`;
    }
    return null;
  }

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploadError(null);
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          setUploadError(error);
          showToast(error, "error");
          continue;
        }

        try {
          await uploadDocument.mutateAsync(file);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to upload file";
          setUploadError(errorMessage);
          showToast(`Upload failed: ${errorMessage}`, "error");
        }
      }
    },
    [uploadDocument],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload],
  );

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  }

  function handleDeleteDocument(id: string) {
    deleteDocument.mutate(id);
  }

  function handleRetryProcessing(id: string) {
    retryProcessing.mutate(id);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: notebook.color || "#6366f1" }}
          />
          <h1 className="text-xl font-semibold">{notebook.name}</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border px-6">
          <TabsList className="h-10">
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="documents"
          className="flex-1 overflow-y-auto p-6 mt-0"
        >
          {/* Upload Zone */}
          <div
            className={cn(
              "relative mb-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_FILE_TYPES.join(",")}
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">
              Drag and drop files here, or{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, TXT, MD, DOCX, HTML
            </p>
            {uploadDocument.isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              </div>
            )}
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {uploadError}
            </div>
          )}

          {/* Document List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDelete={() => handleDeleteDocument(doc.id)}
                  onRetry={() => handleRetryProcessing(doc.id)}
                  onPreview={() => setPreviewDocument(doc)}
                  isDeleting={deleteDocument.isPending}
                  isRetrying={retryProcessing.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                No documents yet
              </p>
              <p className="text-xs text-muted-foreground">
                Upload documents to build your knowledge base
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="chat"
          className="flex flex-1 flex-col overflow-hidden mt-0"
        >
          {/* Model Selector Bar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <ModelSelector
              selectedModel={effectiveModel}
              onSelectModel={setSelectedModel}
            />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Chat Session List */}
            <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
              <ChatSessionList
                notebookId={notebook.id}
                selectedSessionId={selectedSession?.id || null}
                onSelectSession={setSelectedSession}
              />
            </div>

            {/* Chat View */}
            <div className="flex-1 overflow-hidden">
              {selectedSession ? (
                <ChatView
                  sessionId={selectedSession.id}
                  notebookId={notebook.id}
                  selectedModel={effectiveModel}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h2 className="mb-2 text-lg font-semibold">
                      Select or create a chat
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a chat session from the sidebar or create a new
                      one.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DocumentPreview
        document={previewDocument}
        open={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}

interface DocumentItemProps {
  document: Document;
  onDelete: () => void;
  onRetry: () => void;
  onPreview: () => void;
  isDeleting: boolean;
  isRetrying: boolean;
}

function DocumentItem({
  document,
  onDelete,
  onRetry,
  onPreview,
  isDeleting,
  isRetrying,
}: DocumentItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {document.filename}
          </span>
          <StatusBadge
            status={document.processing_status}
            progress={document.processing_progress}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(document.file_size)}</span>
          {document.chunk_count > 0 && (
            <>
              <span>|</span>
              <span>{document.chunk_count} chunks</span>
            </>
          )}
          {document.processing_error && (
            <>
              <span>|</span>
              <span className="text-destructive">
                {document.processing_error}
              </span>
            </>
          )}
        </div>
        {document.processing_status === "processing" && (
          <div className="mt-2 flex items-center gap-2">
            <Progress
              value={document.processing_progress}
              className="h-1.5 flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">
              {document.processing_progress}%
            </span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {document.processing_status === "ready" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onPreview}
            title="Preview document"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {document.processing_status === "failed" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw
              className={cn("h-4 w-4", isRetrying && "animate-spin")}
            />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  progress,
}: {
  status: Document["processing_status"];
  progress: number;
}) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-info/15 px-2 py-0.5 text-xs font-medium text-info">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress < 33
            ? "Extracting"
            : progress < 66
              ? "Chunking"
              : "Embedding"}
        </span>
      );
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
          <CheckCircle className="h-3 w-3" />
          Ready
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
