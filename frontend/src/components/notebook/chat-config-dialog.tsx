"use client";

import { useState, useEffect, useMemo } from "react";
import { Settings2, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import { useLLMProviders } from "@/hooks/use-llm-providers";
import { cn } from "@/lib/utils";
import type {
  Notebook,
  ChatStyle,
  ResponseLength,
  LLMProvider,
} from "@/types/api";

interface ChatConfigDialogProps {
  notebook: Notebook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatConfigDialog({
  notebook,
  open,
  onOpenChange,
}: ChatConfigDialogProps) {
  const [chatStyle, setChatStyle] = useState<ChatStyle>(notebook.chat_style);
  const [responseLength, setResponseLength] = useState<ResponseLength>(
    notebook.response_length,
  );
  const [customInstructions, setCustomInstructions] = useState(
    notebook.custom_instructions || "",
  );
  const [llmProvider, setLLMProvider] = useState<LLMProvider>(
    notebook.llm_provider,
  );
  const [llmModel, setLLMModel] = useState(notebook.llm_model);

  const updateNotebook = useUpdateNotebook();
  const { data: providers, isLoading: providersLoading } = useLLMProviders();

  // Get available models for selected provider
  const availableModels = useMemo(
    () => providers?.find((p) => p.name === llmProvider)?.models || [],
    [providers, llmProvider],
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setChatStyle(notebook.chat_style);
      setResponseLength(notebook.response_length);
      setCustomInstructions(notebook.custom_instructions || "");
      setLLMProvider(notebook.llm_provider);
      setLLMModel(notebook.llm_model);
    }
  }, [open, notebook]);

  // Update model when provider changes
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(llmModel)) {
      setLLMModel(availableModels[0]);
    }
  }, [llmProvider, availableModels, llmModel]);

  function handleSave() {
    updateNotebook.mutate(
      {
        id: notebook.id,
        data: {
          chat_style: chatStyle,
          response_length: responseLength,
          custom_instructions:
            chatStyle === "custom" ? customInstructions : null,
          llm_provider: llmProvider,
          llm_model: llmModel,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Chat Settings
          </DialogTitle>
          <DialogDescription>
            Customize how the AI responds to your questions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Conversational Style */}
          <div className="space-y-3">
            <Label>Conversational style</Label>
            <div className="flex gap-2">
              <StyleButton
                active={chatStyle === "default"}
                onClick={() => setChatStyle("default")}
              >
                Default
              </StyleButton>
              <StyleButton
                active={chatStyle === "learning_guide"}
                onClick={() => setChatStyle("learning_guide")}
              >
                Learning Guide
              </StyleButton>
              <StyleButton
                active={chatStyle === "custom"}
                onClick={() => setChatStyle("custom")}
              >
                Custom
              </StyleButton>
            </div>
            {chatStyle === "learning_guide" && (
              <p className="text-xs text-muted-foreground">
                AI will act as a tutor, breaking down concepts and asking
                follow-up questions.
              </p>
            )}
          </div>

          {/* Custom Instructions (shown when Custom is selected) */}
          {chatStyle === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-instructions">Custom instructions</Label>
              <Textarea
                id="custom-instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Describe how you want the AI to respond..."
                className="min-h-24 resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {customInstructions.length}/2000 characters
              </p>
            </div>
          )}

          {/* Response Length */}
          <div className="space-y-3">
            <Label>Response length</Label>
            <div className="flex gap-2">
              <StyleButton
                active={responseLength === "shorter"}
                onClick={() => setResponseLength("shorter")}
              >
                Shorter
              </StyleButton>
              <StyleButton
                active={responseLength === "default"}
                onClick={() => setResponseLength("default")}
              >
                Default
              </StyleButton>
              <StyleButton
                active={responseLength === "longer"}
                onClick={() => setResponseLength("longer")}
              >
                Longer
              </StyleButton>
            </div>
          </div>

          {/* LLM Provider */}
          <div className="space-y-3">
            <Label>AI Provider</Label>
            {providersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading providers...
              </div>
            ) : (
              <div className="flex gap-2">
                {providers?.map((provider) => (
                  <StyleButton
                    key={provider.name}
                    active={llmProvider === provider.name}
                    onClick={() =>
                      provider.available &&
                      setLLMProvider(provider.name as LLMProvider)
                    }
                    disabled={!provider.available}
                  >
                    {provider.name === "ollama"
                      ? "Ollama"
                      : provider.name === "anthropic"
                        ? "Claude"
                        : "GPT"}
                    {!provider.available && " (N/A)"}
                  </StyleButton>
                ))}
              </div>
            )}
          </div>

          {/* Model Selection */}
          {availableModels.length > 0 && (
            <div className="space-y-3">
              <Label>Model</Label>
              <div className="relative">
                <select
                  value={llmModel}
                  onChange={(e) => setLLMModel(e.target.value)}
                  className="w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-8 text-sm"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateNotebook.isPending}>
            {updateNotebook.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StyleButton({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
        disabled && "hover:bg-background",
      )}
    >
      {children}
    </button>
  );
}
