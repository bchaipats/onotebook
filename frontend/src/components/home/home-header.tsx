"use client";

import { BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OllamaStatus } from "@/components/ollama/ollama-status";
import { APP_NAME } from "@/lib/constants";

interface HomeHeaderProps {
  onOpenSettings: () => void;
}

export function HomeHeader({ onOpenSettings }: HomeHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold text-on-background">
            {APP_NAME}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <OllamaStatus showLabel={false} />
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-on-primary">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
