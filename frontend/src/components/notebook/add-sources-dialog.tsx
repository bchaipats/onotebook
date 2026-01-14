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
  ArrowLeft,
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

type DialogView = "main" | "paste" | "youtube" | "website";

interface UploadingFile {
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error";
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
  const [view, setView] = useState<DialogView>("main");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const invalidateDocuments = useInvalidateDocuments(notebookId);
  const { data: sourceCount } = useSourceCount(notebookId);

  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

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

          setUploadingFiles((prev) => {
            const updated = prev.map((f) =>
              f.name === file.name
                ? { ...f, progress: 100, status: "complete" as const }
                : f,
            );
            // Close modal after brief delay if all files completed successfully
            const allComplete = updated.every((f) => f.status === "complete");
            if (allComplete) {
              setTimeout(() => {
                onOpenChange(false);
                setUploadingFiles([]);
              }, 500);
            }
            return updated;
          });

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
    [notebookId, invalidateDocuments, onOpenChange],
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
      setPasteContent("");
      setPasteError(null);
      setView("main");
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
      onOpenChange(false);
      setView("main");
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
      onOpenChange(false);
      setView("main");
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
        title: "Pasted Text",
        content: pasteContent,
      });
      invalidateDocuments();
      setPasteContent("");
      onOpenChange(false);
      setView("main");
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
      <DialogContent
        className={cn(
          "rounded-2xl",
          view === "main" ? "max-w-7xl" : "max-w-6xl",
        )}
      >
        <div className="flex items-center gap-2 pr-12">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-on-surface">ONotebook</span>
        </div>

        {view === "main" && (
          <>
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
                (Examples: marketing plans, course reading, research notes,
                meeting transcripts, sales documents, etc.)
              </span>
            </DialogDescription>

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
                <span className="text-primary hover:underline">
                  choose file
                </span>{" "}
                to upload
              </p>
              <p className="text-xs text-on-surface-subtle">
                Supported file types: PDF, .txt, Markdown, .docx, .html
              </p>
            </div>

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

            <div className="mt-8 grid grid-cols-3 gap-5">
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

              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 text-on-surface">
                  <Link2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Link</span>
                </div>
                <div className="mt-3 flex flex-row gap-2">
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => setView("website")}
                    className="shrink-0 gap-1.5 rounded-full text-xs"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </Button>
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => setView("youtube")}
                    className="shrink-0 gap-1.5 rounded-full text-xs"
                  >
                    <YoutubeIcon className="h-3.5 w-3.5" />
                    YouTube
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 text-on-surface">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-medium">Paste text</span>
                </div>
                <div className="mt-3">
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => setView("paste")}
                    className="gap-1.5 rounded-full text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Copied text
                  </Button>
                </div>
              </div>
            </div>

            {sourceCount && (
              <div className="mt-6 flex items-center gap-3">
                <FileText className="h-4 w-4 text-on-surface-muted" />
                <span className="text-sm text-on-surface-muted">
                  Source limit
                </span>
                <Progress value={limitPercentage} className="h-2 flex-1" />
                <span className="text-sm text-on-surface-muted">
                  {sourceCount.count} / {sourceCount.limit}
                </span>
              </div>
            )}
          </>
        )}

        {view === "paste" && (
          <>
            <button
              onClick={() => {
                setView("main");
                setPasteContent("");
                setPasteError(null);
              }}
              className="flex items-center gap-2 text-on-surface hover:text-on-surface-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              <DialogTitle className="text-xl font-semibold">
                Paste copied text
              </DialogTitle>
            </button>
            <DialogDescription className="mt-2">
              Paste your copied text below to upload as a source in ONotebook
            </DialogDescription>

            <form onSubmit={handlePasteSubmit} className="mt-6 flex flex-col">
              <Textarea
                id="paste-content"
                placeholder="Paste text here*"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                disabled={pasteLoading}
                className="min-h-[280px] resize-none rounded-xl border-border"
              />
              {pasteError && (
                <p className="mt-2 text-xs text-destructive">{pasteError}</p>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={!pasteContent.trim() || pasteLoading}
                  variant="tonal"
                  className="rounded-full"
                >
                  {pasteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Insert"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {view === "youtube" && (
          <>
            <button
              onClick={() => {
                setView("main");
                setYoutubeInput("");
                setYoutubeError(null);
              }}
              className="flex items-center gap-2 text-on-surface hover:text-on-surface-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              <DialogTitle className="text-xl font-semibold">
                YouTube URL
              </DialogTitle>
            </button>
            <DialogDescription className="mt-2">
              Paste in a YouTube URL below to upload as a source in ONotebook
            </DialogDescription>

            <form onSubmit={handleYoutubeSubmit} className="mt-6">
              <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                <YoutubeIcon className="h-5 w-5 shrink-0 text-on-surface-muted" />
                <Input
                  id="youtube-input"
                  type="url"
                  placeholder="Paste YouTube URL*"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  disabled={youtubeLoading}
                  className="flex-1 border-0 p-0 focus-visible:ring-0"
                />
              </div>
              {youtubeError && (
                <p className="mt-2 text-xs text-destructive">{youtubeError}</p>
              )}

              <div className="mt-6">
                <p className="text-sm font-medium text-on-surface">Notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-muted">
                  <li>
                    Only the text transcript will be imported at this moment
                  </li>
                  <li>Only public YouTube videos are supported</li>
                  <li>
                    Recently uploaded videos may not be available to import
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  disabled={!youtubeInput.trim() || youtubeLoading}
                  variant="tonal"
                  className="rounded-full"
                >
                  {youtubeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Insert"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {view === "website" && (
          <>
            <button
              onClick={() => {
                setView("main");
                setUrlInput("");
                setUrlError(null);
              }}
              className="flex items-center gap-2 text-on-surface hover:text-on-surface-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              <DialogTitle className="text-xl font-semibold">
                Website URLs
              </DialogTitle>
            </button>
            <DialogDescription className="mt-2">
              Paste in Web URLs below to upload as sources in ONotebook.
            </DialogDescription>

            <form onSubmit={handleUrlSubmit} className="mt-6">
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <Globe className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-muted" />
                <Textarea
                  id="url-input"
                  placeholder="Paste URLs*"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={urlLoading}
                  className="min-h-[160px] flex-1 resize-none border-0 p-0 focus-visible:ring-0"
                />
              </div>
              {urlError && (
                <p className="mt-2 text-xs text-destructive">{urlError}</p>
              )}

              <div className="mt-6">
                <p className="text-sm font-medium text-on-surface">Notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-muted">
                  <li>
                    To add multiple URLs, separate with a space or new line.
                  </li>
                  <li>
                    Only the visible text on the website will be imported.
                  </li>
                  <li>Paid articles are not supported.</li>
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  disabled={!urlInput.trim() || urlLoading}
                  variant="tonal"
                  className="rounded-full"
                >
                  {urlLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Insert"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
