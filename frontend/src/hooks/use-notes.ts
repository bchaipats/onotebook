import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, getNotes, updateNote } from "@/lib/api";
import type { Note } from "@/types/api";

export function useNotes(notebookId: string | undefined) {
  return useQuery({
    queryKey: ["notes", notebookId],
    queryFn: () => getNotes(notebookId!),
    enabled: !!notebookId,
  });
}

export function useCreateNote(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      content: string;
      title?: string;
      sourceMessageId?: string;
    }) =>
      createNote(notebookId, data.content, data.title, data.sourceMessageId),
    onSuccess: (newNote) => {
      queryClient.setQueryData<Note[]>(["notes", notebookId], (old) =>
        old ? [newNote, ...old] : [newNote],
      );
    },
  });
}

export function useUpdateNote(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { noteId: string; title?: string; content?: string }) =>
      updateNote(data.noteId, { title: data.title, content: data.content }),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<Note[]>(["notes", notebookId], (old) =>
        old?.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
      );
    },
  });
}

export function useDeleteNote(notebookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: (_, noteId) => {
      queryClient.setQueryData<Note[]>(["notes", notebookId], (old) =>
        old?.filter((n) => n.id !== noteId),
      );
    },
  });
}
