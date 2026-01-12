"use client";

import { useEffect, useState, useCallback } from "react";
import { HomePage } from "@/components/home";
import { SettingsModal } from "@/components/settings/settings-modal";
import { OllamaErrorDialog } from "@/components/ollama/ollama-error-dialog";
import { getHealth } from "@/lib/api";
import { BookOpen, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { HealthResponse } from "@/types/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isInitialLoading && health && !health.ollama_connected && !error) {
      setOllamaErrorOpen(true);
    }
  }, [health, isInitialLoading, error]);

  const handleOllamaRetry = async () => {
    setOllamaErrorOpen(false);
    await checkHealth();
    const newHealth = await getHealth();
    if (!newHealth.ollama_connected) {
      setOllamaErrorOpen(true);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-on-background">
          <div className="flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-primary" />
            <span className="text-2xl font-semibold">{APP_NAME}</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {error && (
        <div className="flex items-center justify-between gap-4 bg-destructive-muted px-4 py-2">
          <div className="flex items-center gap-2 text-on-destructive-muted">
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

      <HomePage onOpenSettings={() => setSettingsOpen(true)} />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OllamaErrorDialog
        open={ollamaErrorOpen}
        onOpenChange={setOllamaErrorOpen}
        onRetry={handleOllamaRetry}
      />
    </div>
  );
}
