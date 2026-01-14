"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  BookOpen,
  Upload,
  FileText,
  Check,
  X,
  Loader2,
  Globe,
  Cloud,
  YoutubeIcon,
  Sparkles,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadDocument, createSource } from "@/lib/api";
import { useInvalidateDocuments } from "@/hooks/use-documents";
import { useSourceCount } from "@/hooks/use-sources";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/html": [".html"],
};

type ExpandedCard = "link" | "paste" | null;

interface UploadingFile {
  name: string;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}

interface AddSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
  onDiscoverSources?: () => void;
}

export function AddSourcesDialog({
  open,
  onOpenChange,
  notebookId,
  onDiscoverSources,
}: AddSourcesDialogProps) {
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const invalidateDocuments = useInvalidateDocuments(notebookId);
  const { data: sourceCount } = useSourceCount(notebookId);

  // URL source state
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // YouTube source state
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // Paste source state
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploadingFiles((prev) => [
          ...prev,
          { name: file.name, progress: 0, status: "uploading" },
        ]);

        try {
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.name === file.name && f.progress < 90
                  ? { ...f, progress: f.progress + 10 }
                  : f,
              ),
            );
          }, 100);

          await uploadDocument(notebookId, file);

          clearInterval(progressInterval);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? { ...f, progress: 100, status: "complete" }
                : f,
            ),
          );

          invalidateDocuments();
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? {
                    ...f,
                    status: "error",
                    error:
                      error instanceof Error ? error.message : "Upload failed",
                  }
                : f,
            ),
          );
        }
      }
    },
    [notebookId, invalidateDocuments],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  });

  function handleClose() {
    const hasActiveUploads = uploadingFiles.some(
      (f) => f.status === "uploading",
    );
    const isLoading = urlLoading || youtubeLoading || pasteLoading;
    if (!hasActiveUploads && !isLoading) {
      setUploadingFiles([]);
      setUrlInput("");
      setUrlError(null);
      setYoutubeInput("");
      setYoutubeError(null);
      setPasteTitle("");
      setPasteContent("");
      setPasteError(null);
      setExpandedCard(null);
      onOpenChange(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlLoading(true);
    setUrlError(null);

    try {
      await createSource(notebookId, {
        source_type: "url",
        url: urlInput.trim(),
      });
      invalidateDocuments();
      setUrlInput("");
      setExpandedCard(null);
    } catch (error) {
      setUrlError(
        error instanceof Error ? error.message : "Failed to add website",
      );
    } finally {
      setUrlLoading(false);
    }
  }

  async function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!youtubeInput.trim()) return;

    setYoutubeLoading(true);
    setYoutubeError(null);

    try {
      await createSource(notebookId, {
        source_type: "youtube",
        url: youtubeInput.trim(),
      });
      invalidateDocuments();
      setYoutubeInput("");
      setExpandedCard(null);
    } catch (error) {
      setYoutubeError(
        error instanceof Error ? error.message : "Failed to add YouTube video",
      );
    } finally {
      setYoutubeLoading(false);
    }
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    setPasteLoading(true);
    setPasteError(null);

    try {
      await createSource(notebookId, {
        source_type: "paste",
        title: pasteTitle.trim() || "Pasted Text",
        content: pasteContent,
      });
      invalidateDocuments();
      setPasteTitle("");
      setPasteContent("");
      setExpandedCard(null);
    } catch (error) {
      setPasteError(
        error instanceof Error ? error.message : "Failed to add pasted text",
      );
    } finally {
      setPasteLoading(false);
    }
  }

  function removeFile(name: string) {
    setUploadingFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const limitPercentage = sourceCount
    ? (sourceCount.count / sourceCount.limit) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl rounded-2xl">
        <div className="flex items-center gap-2 pr-12">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-on-surface">ONotebook</span>
        </div>

        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            Add sources
          </DialogTitle>
          <Button
            variant="tonal"
            onClick={() => {
              onOpenChange(false);
              onDiscoverSources?.();
            }}
            className="gap-2 rounded-full"
          >
            <Sparkles className="h-4 w-4" />
            Discover sources
          </Button>
        </div>
        <DialogDescription className="mb-6 mt-2">
          Sources let ONotebook base its responses on the information that
          matters to you.
          <br />
          <span className="text-on-surface-subtle">
            (Examples: marketing plans, course reading, research notes, meeting
            transcripts, sales documents, etc.)
          </span>
        </DialogDescription>

        {/* Upload Dropzone - Always Visible */}
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface p-16 text-center transition-colors hover:border-primary flex flex-col items-center justify-center",
            isDragActive && "border-primary bg-primary-muted/20",
          )}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted">
            <Upload className="h-7 w-7 text-on-primary-muted" />
          </div>
          <p className="mb-1 font-medium text-on-surface">Upload sources</p>
          <p className="mb-2 text-sm text-on-surface-muted">
            Drag & drop or{" "}
            <span className="text-primary hover:underline">choose file</span> to
            upload
          </p>
          <p className="text-xs text-on-surface-subtle">
            Supported file types: PDF, .txt, Markdown, .docx, .html
          </p>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 rounded-lg bg-surface-variant p-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-on-surface-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {file.name}
                    </p>
                    {file.status === "complete" && (
                      <Check className="h-4 w-4 text-success" />
                    )}
                    {file.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {file.status === "error" && (
                      <button
                        onClick={() => removeFile(file.name)}
                        className="text-destructive hover:text-destructive-hover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                  )}
                  {file.status === "error" && (
                    <p className="mt-1 text-xs text-destructive">
                      {file.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Source Type Cards */}
        <div className="mt-8 grid grid-cols-3 gap-5">
          {/* Google Drive Card */}
          <div className="rounded-xl border border-border bg-surface p-5 opacity-50">
            <div className="flex items-center gap-2 text-on-surface-muted">
              <Cloud className="h-5 w-5" />
              <span className="text-sm font-medium">Google Workspace</span>
            </div>
            <div className="mt-3">
              <Button
                variant="tonal"
                size="sm"
                disabled
                className="gap-1.5 rounded-full text-xs"
              >
                <Cloud className="h-3.5 w-3.5" />
                Google Drive
              </Button>
            </div>
          </div>

          {/* Link Card */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-on-surface">
              <Link2 className="h-5 w-5" />
              <span className="text-sm font-medium">Link</span>
            </div>
            <div className="mt-3 flex flex-row gap-2">
              <Button
                variant="tonal"
                size="sm"
                onClick={() =>
                  setExpandedCard(expandedCard === "link" ? null : "link")
                }
                className="shrink-0 gap-1.5 rounded-full text-xs"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </Button>
              <Button
                variant="tonal"
                size="sm"
                onClick={() =>
                  setExpandedCard(expandedCard === "link" ? null : "link")
                }
                className="shrink-0 gap-1.5 rounded-full text-xs"
              >
                <YoutubeIcon className="h-3.5 w-3.5" />
                YouTube
              </Button>
            </div>
          </div>

          {/* Paste Text Card */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-on-surface">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Paste text</span>
            </div>
            <div className="mt-3">
              <Button
                variant="tonal"
                size="sm"
                onClick={() =>
                  setExpandedCard(expandedCard === "paste" ? null : "paste")
                }
                className="gap-1.5 rounded-full text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Copied text
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Link Form */}
        {expandedCard === "link" && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">
                Add from URL
              </span>
              <button
                onClick={() => setExpandedCard(null)}
                className="rounded-full p-1 text-on-surface-muted hover:bg-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Website URL */}
            <form onSubmit={handleUrlSubmit} className="mt-4">
              <Label htmlFor="url-input" className="text-xs">
                Website URL
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={urlLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!urlInput.trim() || urlLoading}
                  size="sm"
                >
                  {urlLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
              {urlError && (
                <p className="mt-1 text-xs text-destructive">{urlError}</p>
              )}
            </form>

            {/* YouTube URL */}
            <form onSubmit={handleYoutubeSubmit} className="mt-4">
              <Label htmlFor="youtube-input" className="text-xs">
                YouTube URL
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="youtube-input"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  disabled={youtubeLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!youtubeInput.trim() || youtubeLoading}
                  size="sm"
                >
                  {youtubeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
              {youtubeError && (
                <p className="mt-1 text-xs text-destructive">{youtubeError}</p>
              )}
            </form>

            <p className="mt-3 text-xs text-on-surface-subtle">
              Only visible text will be imported. Paywalled articles are not
              supported.
            </p>
          </div>
        )}

        {/* Expanded Paste Form */}
        {expandedCard === "paste" && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">
                Paste text
              </span>
              <button
                onClick={() => setExpandedCard(null)}
                className="rounded-full p-1 text-on-surface-muted hover:bg-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePasteSubmit} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="paste-title" className="text-xs">
                  Title (optional)
                </Label>
                <Input
                  id="paste-title"
                  type="text"
                  placeholder="My Notes"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  disabled={pasteLoading}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paste-content" className="text-xs">
                  Content
                </Label>
                <Textarea
                  id="paste-content"
                  placeholder="Paste your text here..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  disabled={pasteLoading}
                  rows={6}
                  className="mt-1 resize-none"
                />
              </div>
              {pasteError && (
                <p className="text-xs text-destructive">{pasteError}</p>
              )}
              <Button
                type="submit"
                disabled={!pasteContent.trim() || pasteLoading}
                className="w-full"
              >
                {pasteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding text...
                  </>
                ) : (
                  "Add Text"
                )}
              </Button>
            </form>

            <p className="mt-3 text-xs text-on-surface-subtle">
              Maximum 500KB of text content.
            </p>
          </div>
        )}

        {/* Source Limit Indicator */}
        {sourceCount && (
          <div className="mt-6 flex items-center gap-3">
            <FileText className="h-4 w-4 text-on-surface-muted" />
            <span className="text-sm text-on-surface-muted">Source limit</span>
            <Progress value={limitPercentage} className="h-2 flex-1" />
            <span className="text-sm text-on-surface-muted">
              {sourceCount.count} / {sourceCount.limit}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
