import type { LucideIcon } from "lucide-react";

export interface ArtifactViewProps<TData> {
  data: TData;
  onClose: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export interface ArtifactConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}
