import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSourceGuide,
  generateSourceGuide,
  getSourceContent,
  searchSources,
  addSourcesFromSearch,
  getSourceCount,
} from "@/lib/api";

export function useSourceGuide(documentId: string | null) {
  return useQuery({
    queryKey: ["source-guide", documentId],
    queryFn: () => getSourceGuide(documentId!),
    enabled: !!documentId,
    staleTime: Infinity,
  });
}

export function useGenerateSourceGuide(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateSourceGuide(documentId),
    onSuccess: (data) => {
      queryClient.setQueryData(["source-guide", documentId], data);
    },
  });
}

export function useSourceContent(documentId: string | null) {
  return useQuery({
    queryKey: ["source-content", documentId],
    queryFn: () => getSourceContent(documentId!),
    enabled: !!documentId,
    staleTime: Infinity,
  });
}

export function useSearchSources(notebookId: string) {
  return useMutation({
    mutationFn: ({ query, mode }: { query: string; mode: "fast" | "deep" }) =>
      searchSources(notebookId, query, mode),
  });
}

export function useAddSourcesFromSearch(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urls: string[]) => addSourcesFromSearch(notebookId, urls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["source-count", notebookId] });
    },
  });
}

export function useSourceCount(notebookId: string) {
  return useQuery({
    queryKey: ["source-count", notebookId],
    queryFn: () => getSourceCount(notebookId),
    enabled: !!notebookId,
  });
}
