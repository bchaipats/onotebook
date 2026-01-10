import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotebooks,
  getNotebook,
  createNotebook,
  deleteNotebook,
  updateNotebook,
  getNotebookSummary,
  generateNotebookSummary,
  type UpdateNotebookData,
} from "@/lib/api";

export function useNotebooks() {
  return useQuery({
    queryKey: ["notebooks"],
    queryFn: getNotebooks,
  });
}

export function useNotebook(id: string) {
  return useQuery({
    queryKey: ["notebook", id],
    queryFn: () => getNotebook(id),
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNotebook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotebookData }) =>
      updateNotebook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotebook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useNotebookSummary(notebookId: string | undefined) {
  return useQuery({
    queryKey: ["notebookSummary", notebookId],
    queryFn: () => getNotebookSummary(notebookId!),
    enabled: !!notebookId,
  });
}

export function useGenerateNotebookSummary(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateNotebookSummary(notebookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notebookSummary", notebookId],
      });
    },
  });
}
