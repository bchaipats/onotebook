"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PanelHeaderProps {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  collapseIcon?: ReactNode;
  onToggleCollapse?: () => void;
}

export function PanelHeader({
  title,
  children,
  actions,
  collapseIcon,
  onToggleCollapse,
}: PanelHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-divider px-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-on-surface">{title}</h2>
        {children}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        {collapseIcon && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onToggleCollapse}
            className="[&_svg]:size-5"
            title="Toggle panel"
          >
            {collapseIcon}
          </Button>
        )}
      </div>
    </div>
  );
}
