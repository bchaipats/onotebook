import { API_BASE_URL } from "./constants";
import type { HealthResponse, Notebook, NotebooksResponse } from "@/types/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
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
  data: { name?: string; color?: string }
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

export { ApiError };
