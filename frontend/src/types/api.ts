export interface HealthResponse {
  status: string;
  version: string;
  ollama_connected: boolean;
}

export type ChatStyle = "default" | "learning_guide" | "custom";
export type ResponseLength = "shorter" | "default" | "longer";
export type LLMProvider = "ollama" | "anthropic" | "openai";

export interface Notebook {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
  // Chat configuration
  chat_style: ChatStyle;
  response_length: ResponseLength;
  custom_instructions: string | null;
  llm_provider: LLMProvider;
  llm_model: string;
}

export interface NotebooksResponse {
  notebooks: Notebook[];
}

export type SourceType = "file" | "url" | "youtube" | "paste";

export interface Document {
  id: string;
  notebook_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number | null;
  chunk_count: number;
  processing_status: "pending" | "processing" | "ready" | "failed";
  processing_progress: number;
  processing_error: string | null;
  created_at: string;
  source_type: SourceType;
  source_url: string | null;
  summary: string | null;
}

export interface SourceGuide {
  document_id: string;
  summary: string | null;
  topics: string[] | null;
  generated_at: string | null;
}

export interface SourceContent {
  document_id: string;
  content: string;
  chunk_count: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
  favicon_url: string | null;
}

export interface WebSearchResponse {
  results: SearchResultItem[];
  query: string;
  mode: string;
}

export interface SourceCountResponse {
  count: number;
  limit: number;
  remaining: number;
}

export interface CreateUrlSourceRequest {
  source_type: "url";
  url: string;
}

export interface CreateYouTubeSourceRequest {
  source_type: "youtube";
  url: string;
}

export interface CreatePasteSourceRequest {
  source_type: "paste";
  title: string;
  content: string;
}

export type CreateSourceRequest =
  | CreateUrlSourceRequest
  | CreateYouTubeSourceRequest
  | CreatePasteSourceRequest;

export interface Chunk {
  id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  page_number: number | null;
}

export interface ModelInfo {
  name: string;
  size: number;
  parameter_size: string | null;
  quantization_level: string | null;
  modified_at: string | null;
  digest: string | null;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

export interface ChatSession {
  id: string;
  notebook_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

export type MessageFeedback = "up" | "down" | null;

export interface ChatMessage {
  id: string;
  chat_session_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  feedback: MessageFeedback;
  created_at: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

export interface SourceInfo {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  relevance_score: number;
  citation_index: number;
}

export interface GroundingMetadata {
  confidence_score: number;
  has_relevant_sources: boolean;
  avg_relevance: number;
  sources_used: number;
  sources_filtered: number;
}

export interface StreamEvent {
  type: "sources" | "token" | "done" | "error" | "suggestions" | "grounding";
  sources?: SourceInfo[];
  content?: string;
  message_id?: string;
  error?: string;
  questions?: string[];
  metadata?: GroundingMetadata;
}

export interface SuggestedQuestionsResponse {
  questions: string[];
}

export interface NotebookSummary {
  summary: string | null;
  key_terms: string[];
  generated_at: string | null;
}

export interface Note {
  id: string;
  notebook_id: string;
  title: string | null;
  content: string;
  source_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotesResponse {
  notes: Note[];
}

export type ThemeSetting = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeSetting;
  default_model: string;
  ollama_url: string;
  top_k: number;
  temperature: number;
}

// Studio types

export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}

export interface MindMapData {
  central_topic: string;
  nodes: MindMapNode[];
}

export interface MindMapResponse {
  id: string;
  notebook_id: string;
  title: string | null;
  data: MindMapData;
  created_at: string;
}
