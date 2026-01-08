import { API_BASE_URL } from "./constants";
import type { HealthResponse, Notebook } from "@/types/api";

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

  return response.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function getNotebooks(): Promise<Notebook[]> {
  return request<Notebook[]>("/api/notebooks");
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

export async function deleteNotebook(id: number): Promise<void> {
  await request<void>(`/api/notebooks/${id}`, {
    method: "DELETE",
  });
}

export { ApiError };
