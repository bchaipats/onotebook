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
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold">{APP_NAME}</span>
        </div>

        <div className="flex items-center gap-3">
          <OllamaStatus showLabel={false} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Button>
          {/* User Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-user-avatar text-sm font-medium text-white">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
