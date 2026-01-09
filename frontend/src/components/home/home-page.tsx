"use client";

import { useState, useMemo } from "react";
import { HomeHeader } from "./home-header";
import { NotebookGrid } from "./notebook-grid";
import { EmptyState } from "./empty-state";
import { CreateNotebookDialog } from "./create-notebook-dialog";
import { useNotebooks, useCreateNotebook } from "@/hooks/use-notebooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, LayoutGrid, List, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/types/api";

interface HomePageProps {
  onSelectNotebook: (notebook: Notebook) => void;
  onOpenSettings: () => void;
}

export function HomePage({ onSelectNotebook, onOpenSettings }: HomePageProps) {
  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const sortedNotebooks = useMemo(() => {
    if (!notebooks) return [];
    return [...notebooks].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [notebooks, sortBy]);

  function handleCreateNotebook(name: string) {
    createNotebook.mutate(
      { name },
      {
        onSuccess: (notebook) => {
          setCreateDialogOpen(false);
          onSelectNotebook(notebook);
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader onOpenSettings={onOpenSettings} />

      <main className="mx-auto max-w-6xl px-6 py-6 md:px-8 md:py-8">
        {/* Controls Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Tab filters */}
          <div className="flex items-center gap-1">
            <button className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background">
              All
            </button>
            <button className="rounded-full px-4 py-1.5 text-sm text-muted-foreground">
              Recent
            </button>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-muted-foreground/20 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1.5",
                  viewMode === "grid"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {viewMode === "grid" && <Check className="h-4 w-4" />}
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1.5",
                  viewMode === "list"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {viewMode === "list" && <Check className="h-4 w-4" />}
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                >
                  {sortBy === "name" ? "Name" : "Most recent"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  {sortBy === "date" && <Check className="mr-2 h-4 w-4" />}
                  <span className={sortBy !== "date" ? "ml-6" : ""}>
                    Most recent
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  {sortBy === "name" && <Check className="mr-2 h-4 w-4" />}
                  <span className={sortBy !== "name" ? "ml-6" : ""}>Name</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Button */}
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 rounded-full"
            >
              <Plus className="h-4 w-4" />
              Create new
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sortedNotebooks.length > 0 ? (
          <NotebookGrid
            notebooks={sortedNotebooks}
            viewMode={viewMode}
            onSelectNotebook={onSelectNotebook}
            onCreateNotebook={() => setCreateDialogOpen(true)}
          />
        ) : (
          <EmptyState onCreateNotebook={() => setCreateDialogOpen(true)} />
        )}
      </main>

      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateNotebook}
        isLoading={createNotebook.isPending}
      />
    </div>
  );
}
