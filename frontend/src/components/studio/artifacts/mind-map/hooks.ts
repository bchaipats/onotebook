import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { getMindMap, generateMindMap } from "@/lib/api";
import { useTaskActions } from "@/stores/task-store";
import type { MindMapResponse } from "@/types/api";

function isGenerating(data: MindMapResponse | null | undefined): boolean {
  return (
    data?.generation_status === "pending" ||
    data?.generation_status === "processing"
  );
}

export function useMindMap(notebookId: string | undefined) {
  const { updateTask, removeTask } = useTaskActions();

  const query = useQuery({
    queryKey: ["mindmap", notebookId],
    queryFn: () => getMindMap(notebookId!),
    enabled: !!notebookId,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (isGenerating(q.state.data) ? 3000 : false),
  });

  useEffect(() => {
    const data = query.data;
    if (!data) return;

    updateTask(data.id, {
      status: data.generation_status,
      progress: data.generation_progress,
      error: data.generation_error,
    });

    if (
      data.generation_status === "ready" ||
      data.generation_status === "failed"
    ) {
      const timer = setTimeout(() => removeTask(data.id), 2000);
      return () => clearTimeout(timer);
    }
  }, [query.data, updateTask, removeTask]);

  return query;
}

export function useGenerateMindMap(notebookId: string) {
  const queryClient = useQueryClient();
  const { addTask } = useTaskActions();

  return useMutation({
    mutationFn: () => generateMindMap(notebookId),
    onSuccess: (data) => {
      addTask({
        id: data.id,
        type: "mindmap",
        status: data.generation_status,
        progress: data.generation_progress,
        notebookId,
        error: data.generation_error,
      });
      queryClient.setQueryData<MindMapResponse | null>(
        ["mindmap", notebookId],
        data,
      );
    },
  });
}
