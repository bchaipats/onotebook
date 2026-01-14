import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { getMindMap, generateMindMap, deleteMindMap } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useTaskActions } from "@/stores/task-store";
import type { MindMapResponse } from "@/types/api";
import type { MindMapOptions } from "@/types/studio";

function isGenerating(data: MindMapResponse | null | undefined): boolean {
  return (
    data?.generation_status === "pending" ||
    data?.generation_status === "processing"
  );
}

export function useMindMap(notebookId: string | undefined) {
  const { updateTask, removeTask } = useTaskActions();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const query = useQuery({
    queryKey: ["mindmap", notebookId],
    queryFn: () => getMindMap(notebookId!),
    enabled: !!notebookId,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      if (eventSourceRef.current) return false;
      return isGenerating(q.state.data) ? 3000 : false;
    },
  });

  useEffect(() => {
    if (!notebookId || !isGenerating(query.data)) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const taskId = query.data?.id;
    if (!taskId) return;

    const eventSource = new EventSource(
      `${API_BASE_URL}/api/notebooks/${notebookId}/studio/mindmap/progress`,
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateTask(taskId, {
          status: data.status,
          progress: data.progress,
          error: data.error,
        });

        if (data.status === "ready" || data.status === "failed") {
          queryClient.invalidateQueries({ queryKey: ["mindmap", notebookId] });
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch {
        // Parse error - ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    notebookId,
    query.data?.id,
    query.data?.generation_status,
    updateTask,
    queryClient,
  ]);

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
    mutationFn: (options?: MindMapOptions) =>
      generateMindMap(notebookId, options),
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

export function useDeleteMindMap(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteMindMap(notebookId),
    onSuccess: () => {
      queryClient.setQueryData<MindMapResponse | null>(
        ["mindmap", notebookId],
        null,
      );
    },
  });
}
