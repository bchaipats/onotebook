import { Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ArtifactConfig } from "./artifacts/types";

const ARTIFACT_COLORS: Record<string, { bg: string; icon: string }> = {
  audio: { bg: "bg-artifact-audio", icon: "text-artifact-audio-icon" },
  video: { bg: "bg-artifact-video", icon: "text-artifact-video-icon" },
  mindmap: { bg: "bg-artifact-mindmap", icon: "text-artifact-mindmap-icon" },
  report: { bg: "bg-artifact-report", icon: "text-artifact-report-icon" },
  flashcards: {
    bg: "bg-artifact-flashcards",
    icon: "text-artifact-flashcards-icon",
  },
  quiz: { bg: "bg-artifact-quiz", icon: "text-artifact-quiz-icon" },
  infographic: {
    bg: "bg-artifact-infographic",
    icon: "text-artifact-infographic-icon",
  },
  slides: { bg: "bg-artifact-slides", icon: "text-artifact-slides-icon" },
};

interface ArtifactCardProps {
  artifact: ArtifactConfig;
  isLoading: boolean;
  progress: number;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function ArtifactCard({
  artifact,
  isLoading,
  progress,
  onClick,
  disabled = false,
  disabledReason,
}: ArtifactCardProps) {
  const Icon = artifact.icon;
  const isDisabled = !artifact.enabled || isLoading || disabled;
  const colors = ARTIFACT_COLORS[artifact.id] || ARTIFACT_COLORS.mindmap;

  const card = (
    <button
      disabled={isDisabled}
      onClick={!isDisabled ? onClick : undefined}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-xl p-3",
        "transition-colors duration-200",
        "hover:brightness-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100",
        colors.bg,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            "shrink-0",
            colors.icon,
          )}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-muted">
            <Progress value={progress} className="h-1 w-10 bg-on-surface/10" />
            <span>{progress}%</span>
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-on-surface/6 text-on-surface/40 transition-colors duration-150 group-hover:bg-on-surface/10 group-hover:text-on-surface-muted">
            <Pencil className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {artifact.beta && (
        <span className="self-start rounded bg-on-surface/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surface">
          Beta
        </span>
      )}

      <span className="truncate text-left text-[13px] font-medium text-on-surface">
        {artifact.label}
      </span>
    </button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent>
          <p>{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}
