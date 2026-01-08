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
  processing_error: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  notebook_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
