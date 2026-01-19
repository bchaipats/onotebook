"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Copy,
  Check,
  Bot,
  Upload,
  SlidersHorizontal,
  MoreVertical,
  Download,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useMessages,
} from "@/hooks/use-chat";
import {
  downloadMarkdown,
  exportToPdf,
  copyToClipboard,
} from "@/lib/export-utils";
import type { Notebook } from "@/types/api";
import { ChatConfigDialog } from "./chat-config-dialog";
import { PanelHeader } from "./panel-header";
import { ChatContent } from "@/components/chat/chat-content";
import {
  usePendingChatMessage,
  useNotebookActions,
} from "@/stores/notebook-store";

interface ChatPanelProps {
  notebookId: string;
  notebook: Notebook;
  hasDocuments: boolean;
}

export function ChatPanel({
  notebookId,
  notebook,
  hasDocuments,
}: ChatPanelProps) {
  const { data: sessions, isLoading: sessionsLoading } =
    useChatSessions(notebookId);
  const createSession = useCreateChatSession(notebookId);
  const deleteSession = useDeleteChatSession(notebookId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const { data: messages } = useMessages(activeSessionId || "");
  const hasMessages = messages && messages.length > 0;

  async function handleCopyChat() {
    if (!hasMessages) return;
    const success = await copyToClipboard(messages);
    if (success) {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    }
  }

  function handleExportMarkdown() {
    if (!hasMessages) return;
    const title = notebook.name || "Chat Export";
    downloadMarkdown(
      messages,
      `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
      title,
    );
  }

  function handleExportPdf() {
    if (!hasMessages) return;
    const title = notebook.name || "Chat Export";
    exportToPdf(messages, title);
  }

  function handleDeleteChat() {
    if (!activeSessionId) return;
    deleteSession.mutate(activeSessionId, {
      onSuccess: () => {
        const otherSessions = sessions?.filter((s) => s.id !== activeSessionId);
        if (otherSessions && otherSessions.length > 0) {
          setActiveSessionId(otherSessions[0].id);
        } else {
          setActiveSessionId(null);
        }
      },
    });
  }

  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  async function handleNewSession() {
    createSession.mutate("New Chat", {
      onSuccess: (session) => {
        setActiveSessionId(session.id);
      },
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Chat"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Configure chat"
              onClick={() => setConfigDialogOpen(true)}
            >
              <SlidersHorizontal />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" title="Chat options">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyChat}
                  disabled={!hasMessages}
                >
                  {exportCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy chat
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportMarkdown}
                  disabled={!hasMessages}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPdf}
                  disabled={!hasMessages}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteChat}
                  disabled={!activeSessionId || deleteSession.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  {deleteSession.isPending
                    ? "Deleting..."
                    : "Delete chat history"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <ChatConfigDialog
        notebook={notebook}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      />

      {sessionsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : activeSessionId ? (
        <ChatContent sessionId={activeSessionId} notebookId={notebookId} />
      ) : (
        <ChatWelcome
          hasDocuments={hasDocuments}
          onCreateSession={handleNewSession}
        />
      )}
    </div>
  );
}

function ChatWelcome({
  hasDocuments,
  onCreateSession,
}: {
  hasDocuments: boolean;
  onCreateSession: () => void;
}) {
  const pendingMessage = usePendingChatMessage();
  const { requestAddSources } = useNotebookActions();
  const handledRef = useRef(false);

  useEffect(() => {
    if (pendingMessage && hasDocuments && !handledRef.current) {
      handledRef.current = true;
      onCreateSession();
    }
  }, [pendingMessage, hasDocuments, onCreateSession]);

  if (hasDocuments) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted">
          <Bot className="h-7 w-7 text-on-primary-muted" />
        </div>
        <h2 className="mb-3 text-lg font-medium text-on-surface">
          Ready to chat
        </h2>
        <p className="mb-4 text-sm text-on-surface-muted">
          Ask questions about your sources
        </p>
        <Button onClick={onCreateSession} className="rounded-full">
          Start chatting
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-variant">
        <Upload className="h-6 w-6 text-on-surface-muted" />
      </div>
      <h2 className="mb-3 text-lg font-medium text-on-surface">
        Add a source to get started
      </h2>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={requestAddSources}
      >
        Upload a source
      </Button>
    </div>
  );
}
