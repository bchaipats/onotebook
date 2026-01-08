export interface HealthResponse {
  status: string;
  version: string;
  ollama_connected: boolean;
}

export interface Notebook {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface Document {
  id: number;
  notebook_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: "pending" | "processing" | "ready" | "failed";
  error_message: string | null;
  chunk_count: number;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  notebook_id: number;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
