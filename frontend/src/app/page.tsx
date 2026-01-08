"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { NotebookView } from "@/components/notebook/notebook-view";
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
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ollamaErrorOpen, setOllamaErrorOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

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
            <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedNotebookId={selectedNotebook?.id}
          onSelectNotebook={setSelectedNotebook}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        <OllamaErrorDialog
          open={ollamaErrorOpen}
          onOpenChange={setOllamaErrorOpen}
          onRetry={handleOllamaRetry}
        />
        <main className="flex-1 overflow-y-auto">
          {selectedNotebook ? (
            <NotebookView notebook={selectedNotebook} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-foreground">
                  Welcome to onotebook
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Select a notebook from the sidebar or create a new one
                </p>
                {health && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>
                      API Status:{" "}
                      <span className="text-green-600">{health.status}</span>
                    </p>
                    <p>Version: {health.version}</p>
                    <p>
                      Ollama:{" "}
                      {health.ollama_connected ? (
                        <span className="text-green-600">Connected</span>
                      ) : (
                        <span className="text-red-600">Disconnected</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
