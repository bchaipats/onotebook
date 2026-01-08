"use client";

import { Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-card",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <BookOpen className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </div>

      {/* Notebook list area */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">
          Create your first notebook to get started
        </p>
      </div>

      {/* Settings button */}
      <div className="border-t border-border p-4">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
