"use client";

import { useEffect, useState, useCallback } from "react";
import { HomePage } from "@/components/home";
import { NotebookLayout } from "@/components/notebook/notebook-layout";
import { SettingsModal } from "@/components/settings/settings-modal";
import { OllamaErrorDialog } from "@/components/ollama/ollama-error-dialog";
import { getHealth } from "@/lib/api";
import { BookOpen, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { HealthResponse, Notebook } from "@/types/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(
    null,
  );
  const [isNewlyCreatedNotebook, setIsNewlyCreatedNotebook] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ollamaErrorOpen, setOllamaErrorOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  function handleSelectNotebook(notebook: Notebook, isNewlyCreated = false) {
    setSelectedNotebook(notebook);
    setIsNewlyCreatedNotebook(isNewlyCreated);
  }

  const checkHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkHealth();
    setIsRetrying(false);
  };

  useEffect(() => {
    checkHealth().finally(() => setIsInitialLoading(false));
  }, [checkHealth]);

  // Show Ollama error dialog when disconnected (only after initial load)
  useEffect(() => {
    if (!isInitialLoading && health && !health.ollama_connected && !error) {
      setOllamaErrorOpen(true);
    }
  }, [health, isInitialLoading, error]);

  const handleOllamaRetry = async () => {
    setOllamaErrorOpen(false);
    await checkHealth();
    // Re-show dialog if still disconnected
    const newHealth = await getHealth();
    if (!newHealth.ollama_connected) {
      setOllamaErrorOpen(true);
    }
  };

  // Initial loading state
  if (isInitialLoading) {
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

  // If notebook is selected, show the notebook layout
  if (selectedNotebook) {
    return (
      <>
        <NotebookLayout
          notebook={selectedNotebook}
          onBack={() => {
            setSelectedNotebook(null);
            setIsNewlyCreatedNotebook(false);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          autoOpenAddSources={isNewlyCreatedNotebook}
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

  // Otherwise, show the homepage
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* API Connection Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-4 bg-destructive px-4 py-2 text-destructive-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              API connection failed: {error}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            Retry
          </Button>
        </div>
      )}

      <HomePage
        onSelectNotebook={handleSelectNotebook}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OllamaErrorDialog
        open={ollamaErrorOpen}
        onOpenChange={setOllamaErrorOpen}
        onRetry={handleOllamaRetry}
      />
    </div>
  );
}
