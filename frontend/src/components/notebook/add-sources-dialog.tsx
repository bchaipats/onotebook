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
  Youtube,
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

type SourceType = "upload" | "link" | "youtube" | "paste" | "drive";

interface SourceOption {
  id: SourceType;
  label: string;
  icon: React.ElementType;
  supported: boolean;
  description?: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { id: "upload", label: "Upload", icon: Upload, supported: true },
  { id: "link", label: "Website", icon: Globe, supported: true },
  { id: "youtube", label: "YouTube", icon: Youtube, supported: true },
  { id: "paste", label: "Paste text", icon: FileText, supported: true },
  {
    id: "drive",
    label: "Google Drive",
    icon: Cloud,
    supported: false,
    description: "Coming soon",
  },
];

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
}

export function AddSourcesDialog({
  open,
  onOpenChange,
  notebookId,
}: AddSourcesDialogProps) {
  const [activeSourceType, setActiveSourceType] =
    useState<SourceType>("upload");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const invalidateDocuments = useInvalidateDocuments(notebookId);

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
          // Simulate progress for upload
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
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  function handleClose() {
    // Only close if no uploads are in progress
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
      onOpenChange(false);
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

  const allUploadsComplete =
    uploadingFiles.length > 0 &&
    uploadingFiles.every((f) => f.status === "complete");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl rounded-2xl">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-on-surface">
            ONotebook
          </span>
        </div>

        <DialogTitle className="text-2xl font-bold">Add sources</DialogTitle>
        <DialogDescription className="mb-4 mt-1">
          Sources let ONotebook base its responses on the information that
          matters to you.
        </DialogDescription>

        <div className="mb-6 flex gap-2">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => option.supported && setActiveSourceType(option.id)}
              disabled={!option.supported}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-3 transition-all",
                activeSourceType === option.id
                  ? "bg-primary-muted text-on-primary-muted"
                  : option.supported
                    ? "bg-surface-variant text-on-surface hover:bg-hover"
                    : "cursor-not-allowed bg-surface-variant text-on-surface-muted opacity-50",
              )}
            >
              <option.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{option.label}</span>
              {option.description && (
                <span className="text-[10px] text-on-surface-subtle">
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeSourceType === "upload" && (
          <>
            <div
              {...getRootProps()}
              className={cn(
                "cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface-variant p-12 text-center transition-all duration-200 hover:border-primary",
                isDragActive
                  ? "scale-[1.02] border-primary bg-primary-muted/20"
                  : "",
              )}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted">
                <Upload className="h-8 w-8 text-on-primary-muted" />
              </div>
              <p className="mb-1 font-medium text-on-surface">
                Drag & drop or{" "}
                <span className="text-primary hover:underline">
                  choose files
                </span>
              </p>
              <p className="text-sm text-on-surface-muted">
                PDF, TXT, MD, DOCX, HTML (max 50MB each)
              </p>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="mt-6 space-y-3">
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

                {allUploadsComplete && (
                  <div className="text-center">
                    <Button onClick={handleClose} className="mt-2">
                      Done
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeSourceType === "link" && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Website URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={urlLoading}
              />
              <p className="text-xs text-on-surface-muted">
                Only visible text will be imported. Paywalled articles are not
                supported.
              </p>
            </div>
            {urlError && <p className="text-sm text-destructive">{urlError}</p>}
            <Button
              type="submit"
              disabled={!urlInput.trim() || urlLoading}
              className="w-full"
            >
              {urlLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding website...
                </>
              ) : (
                "Add Website"
              )}
            </Button>
          </form>
        )}

        {activeSourceType === "youtube" && (
          <form onSubmit={handleYoutubeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-input">YouTube URL</Label>
              <Input
                id="youtube-input"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                disabled={youtubeLoading}
              />
              <p className="text-xs text-on-surface-muted">
                Only the transcript will be imported. Public videos with
                captions only.
              </p>
            </div>
            {youtubeError && (
              <p className="text-sm text-destructive">{youtubeError}</p>
            )}
            <Button
              type="submit"
              disabled={!youtubeInput.trim() || youtubeLoading}
              className="w-full"
            >
              {youtubeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding video...
                </>
              ) : (
                "Add YouTube Video"
              )}
            </Button>
          </form>
        )}

        {activeSourceType === "paste" && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paste-title">Title (optional)</Label>
              <Input
                id="paste-title"
                type="text"
                placeholder="My Notes"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                disabled={pasteLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paste-content">Content</Label>
              <Textarea
                id="paste-content"
                placeholder="Paste your text here..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                disabled={pasteLoading}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-on-surface-muted">
                Maximum 500KB of text content.
              </p>
            </div>
            {pasteError && (
              <p className="text-sm text-destructive">{pasteError}</p>
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
        )}

        {activeSourceType === "drive" && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-variant p-12 text-center">
            <p className="text-lg font-medium text-on-surface">Coming soon</p>
            <p className="mt-2 text-sm text-on-surface-muted">
              Google Drive integration is not yet supported.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
