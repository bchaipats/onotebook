"use client";

import { Terminal, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OllamaErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function OllamaErrorDialog({
  open,
  onOpenChange,
  onRetry,
}: OllamaErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Ollama Not Running
          </DialogTitle>
          <DialogDescription>
            onotebook requires Ollama to be running for chat functionality.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-on-surface">
              To start Ollama:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-on-surface">
              <li>
                Make sure Ollama is installed. If not, download it from{" "}
                <a
                  href="https://ollama.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary-hover"
                >
                  ollama.ai
                </a>
              </li>
              <li>
                Open a terminal and run:
                <code className="block mt-1 px-2 py-1 rounded-lg bg-surface-variant font-mono text-on-surface">
                  ollama serve
                </code>
              </li>
              <li>
                Pull a model (if you haven&apos;t already):
                <code className="block mt-1 px-2 py-1 rounded-lg bg-surface-variant font-mono text-on-surface">
                  ollama pull llama3.2
                </code>
              </li>
            </ol>
          </div>

          <div className="rounded-lg bg-info-muted border border-info/20 p-3">
            <p className="text-xs text-on-surface-muted">
              Ollama runs locally on your machine and does not send your data to
              external servers. The default endpoint is{" "}
              <code className="rounded bg-surface-variant px-1.5 py-0.5 font-mono text-on-surface">
                http://localhost:11434
              </code>
              .
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Download Ollama
            </a>
          </Button>
          <Button size="sm" onClick={onRetry}>
            Retry Connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
