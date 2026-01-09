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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Terminal className="h-5 w-5" />
            Ollama Not Running
          </DialogTitle>
          <DialogDescription>
            onotebook requires Ollama to be running for chat functionality.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">To start Ollama:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Make sure Ollama is installed. If not, download it from{" "}
                <a
                  href="https://ollama.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ollama.ai
                </a>
              </li>
              <li>
                Open a terminal and run:
                <code className="block mt-1 px-2 py-1 bg-muted rounded text-foreground font-mono">
                  ollama serve
                </code>
              </li>
              <li>
                Pull a model (if you haven&apos;t already):
                <code className="block mt-1 px-2 py-1 bg-muted rounded text-foreground font-mono">
                  ollama pull llama3.2
                </code>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Ollama runs locally on your machine and does not send your data to
              external servers. The default endpoint is{" "}
              <code className="text-foreground">http://localhost:11434</code>.
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
