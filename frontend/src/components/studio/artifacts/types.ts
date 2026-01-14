import type { LucideIcon } from "lucide-react";
import type { ArtifactType } from "@/types/studio";

export interface ArtifactViewProps<TData> {
  data: TData;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export interface ArtifactConfig {
  id: ArtifactType;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  beta?: boolean;
}
