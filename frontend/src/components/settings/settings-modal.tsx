"use client";

import { useEffect, useState } from "react";
import {
  Monitor,
  Moon,
  Sun,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useModels, usePullModel } from "@/hooks/use-ollama";
import type { PullProgressEvent } from "@/lib/api";
import { useHealth } from "@/hooks/use-health";
import type { ThemeSetting } from "@/types/api";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { data: settings, isLoading } = useSettings();
  const { data: models } = useModels();
  const { data: health } = useHealth();
  const updateSettings = useUpdateSettings();

  const [theme, setTheme] = useState<ThemeSetting>("system");
  const [defaultModel, setDefaultModel] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [topK, setTopK] = useState(10);
  const [temperature, setTemperature] = useState(0.7);

  // Model pulling state
  const [modelToPull, setModelToPull] = useState("");
  const [pullProgress, setPullProgress] = useState<PullProgressEvent | null>(
    null,
  );
  const [pullError, setPullError] = useState<string | null>(null);
  const [pullComplete, setPullComplete] = useState(false);
  const pullModel = usePullModel();

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme);
      setDefaultModel(settings.default_model);
      setOllamaUrl(settings.ollama_url);
      setTopK(settings.top_k);
      setTemperature(settings.temperature);
    }
  }, [settings]);

  useEffect(() => {
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  function handleThemeChange(value: ThemeSetting) {
    setTheme(value);
    updateSettings.mutate({ theme: value });
  }

  function handleModelChange(value: string) {
    setDefaultModel(value);
    updateSettings.mutate({ default_model: value });
  }

  function handleOllamaUrlChange() {
    updateSettings.mutate({ ollama_url: ollamaUrl });
  }

  function handleTopKChange(value: number[]) {
    setTopK(value[0]);
  }

  function handleTopKCommit(value: number[]) {
    updateSettings.mutate({ top_k: value[0] });
  }

  function handleTemperatureChange(value: number[]) {
    setTemperature(value[0]);
  }

  function handleTemperatureCommit(value: number[]) {
    updateSettings.mutate({ temperature: value[0] });
  }

  async function handlePullModel() {
    if (!modelToPull.trim()) return;

    setPullError(null);
    setPullComplete(false);
    setPullProgress(null);

    try {
      await pullModel.mutateAsync({
        modelName: modelToPull.trim(),
        onProgress: (event) => {
          setPullProgress(event);
          if (event.error) {
            setPullError(event.error);
          }
        },
      });
      setPullComplete(true);
      setModelToPull("");
    } catch (err) {
      setPullError(err instanceof Error ? err.message : "Failed to pull model");
    }
  }

  function calculatePullPercent(): number {
    if (!pullProgress || !pullProgress.total) return 0;
    if (!pullProgress.completed) return 0;
    return Math.round((pullProgress.completed / pullProgress.total) * 100);
  }

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your onotebook preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 pt-4">
            {/* Theme Selection */}
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleThemeChange("system")}
                >
                  <Monitor className="h-4 w-4" />
                  System
                </Button>
              </div>
            </div>

            {/* Ollama URL */}
            <div className="space-y-2">
              <Label htmlFor="ollama-url">Ollama Endpoint URL</Label>
              <div className="flex gap-2">
                <Input
                  id="ollama-url"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <Button
                  variant="outline"
                  onClick={handleOllamaUrlChange}
                  disabled={updateSettings.isPending}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The URL of your Ollama server for running local LLMs.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-6 pt-4">
            {/* Default Model */}
            <div className="space-y-2">
              <Label htmlFor="default-model">Default Model</Label>
              <Select value={defaultModel} onValueChange={handleModelChange}>
                <SelectTrigger id="default-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models && models.length > 0 ? (
                    models.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={defaultModel} disabled>
                      {defaultModel || "No models available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The default LLM model for new chat sessions.
              </p>
            </div>

            {/* Top-K */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Top-K Results</Label>
                <span className="text-sm text-muted-foreground">{topK}</span>
              </div>
              <Slider
                value={[topK]}
                min={1}
                max={20}
                step={1}
                onValueChange={handleTopKChange}
                onValueCommit={handleTopKCommit}
              />
              <p className="text-xs text-muted-foreground">
                Number of document chunks to retrieve for context (1-20).
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[temperature]}
                min={0}
                max={2}
                step={0.1}
                onValueChange={handleTemperatureChange}
                onValueCommit={handleTemperatureCommit}
              />
              <p className="text-xs text-muted-foreground">
                Higher values make responses more creative, lower values more
                focused (0-2).
              </p>
            </div>

            {/* Pull New Model */}
            <div className="space-y-3 border-t pt-4">
              <Label>Pull New Model</Label>
              <div className="flex gap-2">
                <Input
                  value={modelToPull}
                  onChange={(e) => setModelToPull(e.target.value)}
                  placeholder="e.g., llama3.2, tinyllama"
                  disabled={pullModel.isPending}
                />
                <Button
                  variant="outline"
                  onClick={handlePullModel}
                  disabled={pullModel.isPending || !modelToPull.trim()}
                  className="gap-2"
                >
                  {pullModel.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Pull
                </Button>
              </div>

              {/* Progress Bar */}
              {pullModel.isPending && pullProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pullProgress.status}</span>
                    <span>{calculatePullPercent()}%</span>
                  </div>
                  <Progress value={calculatePullPercent()} className="h-2" />
                </div>
              )}

              {/* Success Message */}
              {pullComplete && !pullError && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Model pulled successfully
                </div>
              )}

              {/* Error Message */}
              {pullError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  {pullError}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Download a new model from Ollama. Visit{" "}
                <a
                  href="https://ollama.ai/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ollama.ai/library
                </a>{" "}
                for available models.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Version</span>
                <span className="text-sm text-muted-foreground">
                  {health?.version || "0.1.0"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Ollama Status</span>
                <span
                  className={`text-sm ${
                    health?.ollama_connected
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {health?.ollama_connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="py-2">
                <p className="text-sm text-muted-foreground">
                  onotebook is an open-source RAG knowledge assistant that helps
                  you chat with your documents using local LLMs.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://github.com/onotebook/onotebook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
