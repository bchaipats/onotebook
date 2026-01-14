import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ArtifactConfig } from "./artifacts/types";

interface ArtifactCardProps {
  artifact: ArtifactConfig;
  isLoading: boolean;
  progress: number;
  onClick: () => void;
  index: number;
}

export function ArtifactCard({
  artifact,
  isLoading,
  progress,
  onClick,
  index,
}: ArtifactCardProps) {
  const Icon = artifact.icon;
  return (
    <button
      disabled={!artifact.enabled || isLoading}
      onClick={artifact.enabled ? onClick : undefined}
      className={`animate-spring-in-up stagger-${Math.min(index + 1, 8)} flex flex-col items-start gap-3 rounded-2xl bg-surface-variant p-4 text-left transition-all duration-200 hover:bg-hover hover:shadow-elevation-1 disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-on-primary-muted">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <span className="text-sm font-medium text-on-surface">
        {isLoading ? "Generating..." : artifact.label}
      </span>
      {isLoading && <Progress value={progress} className="mt-1 h-1 w-full" />}
    </button>
  );
}
