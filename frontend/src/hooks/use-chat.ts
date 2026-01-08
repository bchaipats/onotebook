"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getMessages,
} from "@/lib/api";

export function useChatSessions(notebookId: string | undefined) {
  return useQuery({
    queryKey: ["chatSessions", notebookId],
    queryFn: () => getChatSessions(notebookId!),
    enabled: !!notebookId,
  });
}

export function useCreateChatSession(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createChatSession(notebookId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatSessions", notebookId] });
    },
  });
}

export function useDeleteChatSession(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatSessions", notebookId] });
    },
  });
}

export function useMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => getMessages(sessionId!),
    enabled: !!sessionId,
  });
}

export function useInvalidateMessages(sessionId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
  };
}

export function useInvalidateChatSessions(notebookId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["chatSessions", notebookId] });
  };
}
