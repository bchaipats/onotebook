import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotebooks,
  createNotebook,
  deleteNotebook,
  updateNotebook,
} from "@/lib/api";
import type { Notebook } from "@/types/api";

export function useNotebooks() {
  return useQuery({
    queryKey: ["notebooks"],
    queryFn: getNotebooks,
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
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; color?: string };
    }) => updateNotebook(id, data),
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
