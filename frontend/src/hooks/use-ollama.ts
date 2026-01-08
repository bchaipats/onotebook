"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHealth, getModels, getModelInfo, pullModel } from "@/lib/api";
import type { PullProgressEvent } from "@/lib/api";

export function useOllamaStatus() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 10000, // Poll every 10 seconds
    select: (data) => ({
      connected: data.ollama_connected,
      status: data.status,
      version: data.version,
    }),
  });
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: getModels,
    retry: false,
  });
}

export function useModelInfo(modelName: string | null) {
  return useQuery({
    queryKey: ["models", modelName],
    queryFn: () => (modelName ? getModelInfo(modelName) : Promise.reject()),
    enabled: !!modelName,
  });
}

export function usePullModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      modelName,
      onProgress,
    }: {
      modelName: string;
      onProgress: (event: PullProgressEvent) => void;
    }) => {
      await pullModel(modelName, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}
