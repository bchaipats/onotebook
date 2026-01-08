export interface HealthResponse {
  status: string;
  version: string;
  ollama_connected: boolean;
}

export interface Notebook {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface NotebooksResponse {
  notebooks: Notebook[];
}

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
}


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

export interface ChatMessage {
  id: string;
  chat_session_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
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

export interface StreamEvent {
  type: "sources" | "token" | "done" | "error";
  sources?: SourceInfo[];
  content?: string;
  message_id?: string;
  error?: string;
}

export type ThemeSetting = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeSetting;
  default_model: string;
  ollama_url: string;
  top_k: number;
  temperature: number;
}
