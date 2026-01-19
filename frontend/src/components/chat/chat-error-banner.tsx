"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatErrorBannerProps {
  error: string;
  canRetry: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ChatErrorBanner({
  error,
  canRetry,
  onRetry,
  onDismiss,
}: ChatErrorBannerProps) {
  return (
    <div className="bg-destructive-muted p-3 text-center text-sm text-on-destructive-muted">
      <span>{error}</span>
      {canRetry && (
        <Button
          variant="link"
          size="sm"
          className="ml-2 h-auto p-0 font-medium"
          onClick={onRetry}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      )}
      <Button
        variant="link"
        size="sm"
        className="ml-2 h-auto p-0"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </div>
  );
}
