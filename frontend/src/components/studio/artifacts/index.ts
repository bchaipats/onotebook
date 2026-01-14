import {
  AudioLines,
  MonitorPlay,
  FileText,
  Layers,
  CircleCheckBig,
  BarChart3,
  Presentation,
  Workflow,
} from "lucide-react";
import type { ArtifactConfig } from "./types";
import { useMindMap, useGenerateMindMap, useDeleteMindMap } from "./mind-map";

export const ARTIFACTS: ArtifactConfig[] = [
  { id: "audio", label: "Audio Overview", icon: AudioLines, enabled: false },
  { id: "video", label: "Video Overview", icon: MonitorPlay, enabled: false },
  { id: "mindmap", label: "Mind Map", icon: Workflow, enabled: true },
  { id: "report", label: "Reports", icon: FileText, enabled: false },
  { id: "flashcards", label: "Flashcards", icon: Layers, enabled: false },
  { id: "quiz", label: "Quiz", icon: CircleCheckBig, enabled: false },
  {
    id: "infographic",
    label: "Infographic",
    icon: BarChart3,
    enabled: false,
    beta: true,
  },
  {
    id: "slides",
    label: "Slide Deck",
    icon: Presentation,
    enabled: false,
    beta: true,
  },
];

export function useArtifacts(notebookId: string | undefined) {
  return {
    mindmap: {
      query: useMindMap(notebookId),
      generate: useGenerateMindMap(notebookId ?? ""),
      delete: useDeleteMindMap(notebookId ?? ""),
    },
  };
}

export { MindMapView } from "./mind-map";
export type { ArtifactConfig, ArtifactViewProps } from "./types";
