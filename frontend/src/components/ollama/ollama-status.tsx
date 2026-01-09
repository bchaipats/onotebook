"use client";

import { Circle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOllamaStatus } from "@/hooks/use-ollama";

interface OllamaStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function OllamaStatus({
  className,
  showLabel = true,
}: OllamaStatusProps) {
  const { data, isLoading, isError } = useOllamaStatus();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        {showLabel && (
          <span className="text-muted-foreground">Checking...</span>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <AlertCircle className="h-3 w-3 text-destructive" />
        {showLabel && <span className="text-destructive">API Error</span>}
      </div>
    );
  }

  const isConnected = data?.connected ?? false;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Circle
        className={cn(
          "h-3 w-3",
          isConnected
            ? "fill-green-500 text-green-500"
            : "fill-red-500 text-red-500",
        )}
      />
      {showLabel && (
        <span
          className={isConnected ? "text-muted-foreground" : "text-destructive"}
        >
          Ollama {isConnected ? "Connected" : "Disconnected"}
        </span>
      )}
    </div>
  );
}
