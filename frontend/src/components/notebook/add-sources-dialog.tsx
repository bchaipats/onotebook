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
  Link2,
  FileType,
  Cloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadDocument } from "@/lib/api";
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

type SourceType = "upload" | "drive" | "link" | "paste";

interface SourceOption {
  id: SourceType;
  label: string;
  icon: React.ElementType;
  supported: boolean;
  description?: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { id: "upload", label: "Upload", icon: Upload, supported: true },
  {
    id: "drive",
    label: "Google Drive",
    icon: Cloud,
    supported: false,
    description: "Coming soon",
  },
  {
    id: "link",
    label: "Link",
    icon: Link2,
    supported: false,
    description: "Coming soon",
  },
  {
    id: "paste",
    label: "Paste text",
    icon: FileType,
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
    if (!hasActiveUploads) {
      setUploadingFiles([]);
      onOpenChange(false);
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
          <span className="text-lg font-semibold">ONotebook</span>
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
                "flex flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all",
                activeSourceType === option.id
                  ? "border-primary bg-primary/10"
                  : option.supported
                    ? "border-border hover:border-muted-foreground"
                    : "cursor-not-allowed border-border opacity-50",
              )}
            >
              <option.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{option.label}</span>
              {option.description && (
                <span className="text-[10px] text-muted-foreground">
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
                "cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200",
                isDragActive
                  ? "scale-[1.02] border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="mb-1 font-medium">
                Drag & drop or{" "}
                <span className="text-primary hover:underline">
                  choose files
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, TXT, MD, DOCX, HTML (max 50MB each)
              </p>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                {uploadingFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                        {file.status === "complete" && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {file.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {file.status === "error" && (
                          <button
                            onClick={() => removeFile(file.name)}
                            className="text-destructive hover:text-destructive/80"
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

        {activeSourceType !== "upload" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Coming soon
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This source type is not yet supported.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
