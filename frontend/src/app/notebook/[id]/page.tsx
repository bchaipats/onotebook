"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NotebookLayout } from "@/components/notebook/notebook-layout";
import { SettingsModal } from "@/components/settings/settings-modal";
import { OllamaErrorDialog } from "@/components/ollama/ollama-error-dialog";
import { useNotebook } from "@/hooks/use-notebooks";
import { getHealth } from "@/lib/api";
import { BookOpen, Loader2 } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

interface NotebookPageProps {
  params: Promise<{ id: string }>;
}

export default function NotebookPage({ params }: NotebookPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";

  const { data: notebook, isLoading, error } = useNotebook(id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ollamaErrorOpen, setOllamaErrorOpen] = useState(false);

  useEffect(() => {
    getHealth().then((health) => {
      if (!health.ollama_connected) setOllamaErrorOpen(true);
    });
  }, []);

  async function handleOllamaRetry() {
    setOllamaErrorOpen(false);
    const health = await getHealth();
    if (!health.ollama_connected) setOllamaErrorOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-primary" />
            <span className="text-2xl font-semibold">{APP_NAME}</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !notebook) {
    router.replace("/");
    return null;
  }

  return (
    <>
      <NotebookLayout
        notebook={notebook}
        onBack={() => router.push("/")}
        onOpenSettings={() => setSettingsOpen(true)}
        autoOpenAddSources={isNew}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OllamaErrorDialog
        open={ollamaErrorOpen}
        onOpenChange={setOllamaErrorOpen}
        onRetry={handleOllamaRetry}
      />
    </>
  );
}
