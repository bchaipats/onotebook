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
    <div className="flex items-center justify-between border-b py-[var(--panel-header-padding-y)] pl-[var(--panel-header-padding-left)] pr-[var(--panel-header-padding-right)]">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {children}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        {collapseIcon && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
            title="Toggle panel"
          >
            <span className="h-[var(--panel-header-icon-size)] w-[var(--panel-header-icon-size)] [&>svg]:h-full [&>svg]:w-full">
              {collapseIcon}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
