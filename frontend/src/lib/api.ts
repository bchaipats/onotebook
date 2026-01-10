import { API_BASE_URL } from "./constants";
import type {
  HealthResponse,
  Notebook,
  NotebooksResponse,
  ModelInfo,
  ModelsResponse,
  ChatSession,
  ChatSessionsResponse,
  ChatMessage,
  MessagesResponse,
  StreamEvent,
} from "@/types/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function getNotebooks(): Promise<Notebook[]> {
  const response = await request<NotebooksResponse>("/api/notebooks");
  return response.notebooks;
}

export async function createNotebook(data: {
  name: string;
  color?: string;
}): Promise<Notebook> {
  return request<Notebook>("/api/notebooks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNotebook(
  id: string,
  data: { name?: string; color?: string },
): Promise<Notebook> {
  return request<Notebook>(`/api/notebooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteNotebook(id: string): Promise<void> {
  await request<void>(`/api/notebooks/${id}`, {
    method: "DELETE",
  });
}

// Document API

import type {
  Document,
  Chunk,
  CreateSourceRequest,
  SourceGuide,
  SourceContent,
  WebSearchResponse,
  SourceCountResponse,
} from "@/types/api";

interface DocumentsResponse {
  documents: Document[];
}

export async function getDocuments(notebookId: string): Promise<Document[]> {
  const response = await request<DocumentsResponse>(
    `/api/notebooks/${notebookId}/documents`,
  );
  return response.documents;
}

export async function uploadDocument(
  notebookId: string,
  file: File,
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/notebooks/${notebookId}/documents`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  await request<void>(`/api/documents/${id}`, {
    method: "DELETE",
  });
}

export async function getDocument(id: string): Promise<Document> {
  return request<Document>(`/api/documents/${id}`);
}

export async function retryProcessing(id: string): Promise<Document> {
  return request<Document>(`/api/documents/${id}/process`, {
    method: "POST",
  });
}

interface ChunksResponse {
  chunks: Chunk[];
}

export async function getChunks(documentId: string): Promise<Chunk[]> {
  const response = await request<ChunksResponse>(
    `/api/documents/${documentId}/chunks`,
  );
  return response.chunks;
}

export function getDocumentFileUrl(documentId: string): string {
  return `${API_BASE_URL}/api/documents/${documentId}/file`;
}

export async function getDocumentContent(documentId: string): Promise<string> {
  const url = `${API_BASE_URL}/api/documents/${documentId}/content`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }
  return response.text();
}

// Sources API

export async function createSource(
  notebookId: string,
  data: CreateSourceRequest,
): Promise<Document> {
  return request<Document>(`/api/notebooks/${notebookId}/sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function searchSources(
  notebookId: string,
  query: string,
  mode: "fast" | "deep" = "fast",
): Promise<WebSearchResponse> {
  return request<WebSearchResponse>(
    `/api/notebooks/${notebookId}/sources/search`,
    {
      method: "POST",
      body: JSON.stringify({ query, mode }),
    },
  );
}

export async function addSourcesFromSearch(
  notebookId: string,
  urls: string[],
): Promise<Document[]> {
  return request<Document[]>(
    `/api/notebooks/${notebookId}/sources/from-search`,
    {
      method: "POST",
      body: JSON.stringify({ urls }),
    },
  );
}

export async function getSourceGuide(documentId: string): Promise<SourceGuide> {
  return request<SourceGuide>(`/api/documents/${documentId}/guide`);
}

export async function generateSourceGuide(
  documentId: string,
): Promise<SourceGuide> {
  return request<SourceGuide>(`/api/documents/${documentId}/guide/generate`, {
    method: "POST",
  });
}

export async function getSourceContent(
  documentId: string,
): Promise<SourceContent> {
  return request<SourceContent>(`/api/documents/${documentId}/content`);
}

export async function getSourceCount(
  notebookId: string,
): Promise<SourceCountResponse> {
  return request<SourceCountResponse>(
    `/api/notebooks/${notebookId}/sources/count`,
  );
}

// Ollama/Models API

export async function getModels(): Promise<ModelInfo[]> {
  const response = await request<ModelsResponse>("/api/models");
  return response.models;
}

export async function getModelInfo(modelName: string): Promise<ModelInfo> {
  return request<ModelInfo>(`/api/models/${encodeURIComponent(modelName)}`);
}

export interface PullProgressEvent {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export async function pullModel(
  modelName: string,
  onProgress: (event: PullProgressEvent) => void,
): Promise<void> {
  const url = `${API_BASE_URL}/api/models/pull`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: modelName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data) as PullProgressEvent;
          onProgress(event);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

// Chat API

export async function getChatSessions(
  notebookId: string,
): Promise<ChatSession[]> {
  const response = await request<ChatSessionsResponse>(
    `/api/notebooks/${notebookId}/sessions`,
  );
  return response.sessions;
}

export async function createChatSession(
  notebookId: string,
  title?: string,
): Promise<ChatSession> {
  return request<ChatSession>(`/api/notebooks/${notebookId}/sessions`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return request<ChatSession>(`/api/sessions/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await request<void>(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await request<MessagesResponse>(
    `/api/sessions/${sessionId}/messages`,
  );
  return response.messages;
}

export async function sendMessage(
  sessionId: string,
  content: string,
  model: string | null,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
  documentIds?: string[],
): Promise<void> {
  const url = `${API_BASE_URL}/api/sessions/${sessionId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, model, document_ids: documentIds }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data) as StreamEvent;
          onEvent(event);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function regenerateMessage(
  messageId: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${API_BASE_URL}/api/messages/${messageId}/regenerate`;
  const response = await fetch(url, {
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data) as StreamEvent;
          onEvent(event);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

// Settings API

import type { Settings } from "@/types/api";

export async function getSettings(): Promise<Settings> {
  return request<Settings>("/api/settings");
}

export async function updateSettings(
  settings: Partial<Settings>,
): Promise<Settings> {
  return request<Settings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export { ApiError };
