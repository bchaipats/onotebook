"use client";

import { ChevronDown, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModels } from "@/hooks/use-ollama";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel?: string | null;
  onSelectModel?: (model: string) => void;
  className?: string;
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  className,
}: ModelSelectorProps) {
  const { data: models, isLoading, error } = useModels();

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cpu className="h-4 w-4" />
        <span>Unable to load models</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2", className)}
          disabled={isLoading}
        >
          <Cpu className="h-4 w-4" />
          <span className="max-w-32 truncate">
            {isLoading ? "Loading..." : selectedModel || "Select model"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {models && models.length > 0 ? (
          models.map((model) => (
            <DropdownMenuItem
              key={model.name}
              onClick={() => onSelectModel?.(model.name)}
              className={cn(
                "flex flex-col items-start gap-0.5",
                selectedModel === model.name && "bg-accent",
              )}
            >
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatModelSize(model.size)}
                {model.parameter_size && ` • ${model.parameter_size}`}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No models available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatModelSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
