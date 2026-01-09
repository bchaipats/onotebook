"use client";

import { useState } from "react";
import { MessageSquare, Plus, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
} from "@/hooks/use-chat";
import type { ChatSession } from "@/types/api";

interface ChatSessionListProps {
  notebookId: string;
  selectedSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
}

export function ChatSessionList({
  notebookId,
  selectedSessionId,
  onSelectSession,
}: ChatSessionListProps) {
  const { data: sessions, isLoading } = useChatSessions(notebookId);
  const createSession = useCreateChatSession(notebookId);
  const deleteSession = useDeleteChatSession(notebookId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(
    null,
  );

  async function handleCreateSession() {
    const session = await createSession.mutateAsync(undefined);
    onSelectSession(session);
  }

  function handleDeleteClick(session: ChatSession) {
    setDeletingSession(session);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingSession) return;
    await deleteSession.mutateAsync(deletingSession.id);
    setDeletingSession(null);
    setDeleteDialogOpen(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-2">
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleCreateSession}
          disabled={createSession.isPending}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions && sessions.length > 0 ? (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent",
                  selectedSessionId === session.id && "bg-accent",
                )}
                onClick={() => onSelectSession(session)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  {session.title || "New Chat"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(session);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 text-sm text-muted-foreground">
            No chat sessions yet
          </p>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
