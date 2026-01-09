import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  retryProcessing,
} from "@/lib/api";
import type { Document } from "@/types/api";

function hasProcessingDocuments(documents: Document[] | undefined): boolean {
  if (!documents) return false;
  return documents.some(
    (doc) =>
      doc.processing_status === "pending" ||
      doc.processing_status === "processing",
  );
}

export function useDocuments(notebookId: string) {
  return useQuery({
    queryKey: ["documents", notebookId],
    queryFn: () => getDocuments(notebookId),
    enabled: !!notebookId,
    refetchInterval: (query) => {
      return hasProcessingDocuments(query.state.data) ? 3000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useUploadDocument(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadDocument(notebookId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useDeleteDocument(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useRetryProcessing(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryProcessing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", notebookId] });
    },
  });
}

export function useInvalidateDocuments(notebookId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["documents", notebookId] });
    queryClient.invalidateQueries({ queryKey: ["notebooks"] });
  };
}
