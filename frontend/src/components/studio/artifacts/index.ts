import {
  Mic,
  Video,
  FileText,
  CreditCard,
  HelpCircle,
  BarChart3,
  Presentation,
  GitBranch,
} from "lucide-react";
import type { ArtifactConfig } from "./types";
import { useMindMap, useGenerateMindMap } from "./mind-map";

export const ARTIFACTS: ArtifactConfig[] = [
  { id: "audio", label: "Audio Overview", icon: Mic, enabled: false },
  { id: "video", label: "Video Overview", icon: Video, enabled: false },
  { id: "mindmap", label: "Mind Map", icon: GitBranch, enabled: true },
  { id: "reports", label: "Reports", icon: FileText, enabled: false },
  { id: "flashcards", label: "Flashcards", icon: CreditCard, enabled: false },
  { id: "quiz", label: "Quiz", icon: HelpCircle, enabled: false },
  { id: "infographic", label: "Infographic", icon: BarChart3, enabled: false },
  { id: "slides", label: "Slide Deck", icon: Presentation, enabled: false },
];

export function useArtifacts(notebookId: string | undefined) {
  return {
    mindmap: {
      query: useMindMap(notebookId),
      generate: useGenerateMindMap(notebookId ?? ""),
    },
  };
}

export { MindMapView } from "./mind-map";
export type { ArtifactConfig, ArtifactViewProps } from "./types";
