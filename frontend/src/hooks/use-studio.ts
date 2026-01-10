import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMindMap, generateMindMap } from "@/lib/api";
import type { MindMapResponse } from "@/types/api";

export function useMindMap(notebookId: string | undefined) {
  return useQuery({
    queryKey: ["mindmap", notebookId],
    queryFn: () => getMindMap(notebookId!),
    enabled: !!notebookId,
  });
}

export function useGenerateMindMap(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateMindMap(notebookId),
    onSuccess: (data) => {
      queryClient.setQueryData<MindMapResponse | null>(
        ["mindmap", notebookId],
        data,
      );
    },
  });
}
