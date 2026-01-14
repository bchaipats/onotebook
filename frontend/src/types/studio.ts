export type ArtifactType =
  | "mindmap"
  | "quiz"
  | "flashcards"
  | "report"
  | "audio"
  | "video"
  | "infographic"
  | "slides";

export interface MindMapOptions {
  focusTopic?: string;
}

export interface QuizOptions {
  questionCount: 5 | 10 | 15;
  difficulty: "easy" | "medium" | "hard";
  focusTopic?: string;
}
