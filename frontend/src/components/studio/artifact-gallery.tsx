import { formatDistanceToNow } from "date-fns";
import { Workflow, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MindMapResponse } from "@/types/api";

interface GeneratedArtifact {
  type: "mindmap";
  data: MindMapResponse;
}

interface ArtifactGalleryProps {
  artifacts: GeneratedArtifact[];
  sourceCount: number;
  onView: (type: string) => void;
  onRegenerate: (type: string) => void;
  onDelete: (type: string) => void;
}

export function ArtifactGallery({
  artifacts,
  sourceCount,
  onView,
  onRegenerate,
  onDelete,
}: ArtifactGalleryProps) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-heading text-sm font-semibold text-on-surface">
        Generated
      </h3>
      <div className="space-y-2">
        {artifacts.map((artifact) => (
          <GeneratedArtifactCard
            key={artifact.data.id}
            artifact={artifact}
            sourceCount={sourceCount}
            onView={() => onView(artifact.type)}
            onRegenerate={() => onRegenerate(artifact.type)}
            onDelete={() => onDelete(artifact.type)}
          />
        ))}
      </div>
    </div>
  );
}

interface GeneratedArtifactCardProps {
  artifact: GeneratedArtifact;
  sourceCount: number;
  onView: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

function GeneratedArtifactCard({
  artifact,
  sourceCount,
  onView,
  onRegenerate,
  onDelete,
}: GeneratedArtifactCardProps) {
  const { data } = artifact;
  const title = data.title ?? "Mind Map";
  const timeAgo = formatDistanceToNow(new Date(data.created_at), {
    addSuffix: true,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="shrink-0 text-artifact-mindmap-icon">
        <Workflow className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">{title}</p>
        <p className="truncate text-xs text-on-surface-muted">
          {sourceCount} {sourceCount === 1 ? "source" : "sources"} · {timeAgo}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
