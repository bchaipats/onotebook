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
import { Plus, Grid3X3, List, ArrowUpDown, Calendar, SortAsc } from "lucide-react";
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
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notebooks, sortBy]);

  function handleCreateNotebook(name: string, color: string) {
    createNotebook.mutate(
      { name, color },
      {
        onSuccess: (notebook) => {
          setCreateDialogOpen(false);
          onSelectNotebook(notebook);
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader onOpenSettings={onOpenSettings} />

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-12">
        {/* Welcome Hero */}
        <div className="mb-12 text-center animate-slide-in-bottom">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Welcome to onotebook
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your open-source knowledge assistant
          </p>
        </div>

        {/* Controls Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Tab filters */}
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background">
              All
            </button>
            <button className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted">
              Recent
            </button>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border bg-card p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {sortBy === "name" ? "Name" : "Most recent"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setSortBy("date")}
                  className={sortBy === "date" ? "bg-accent" : ""}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Most recent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("name")}
                  className={sortBy === "name" ? "bg-accent" : ""}
                >
                  <SortAsc className="mr-2 h-4 w-4" />
                  Name
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Button */}
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 rounded-full bg-foreground px-5 text-background shadow-md transition-all hover:bg-foreground/90 hover:shadow-lg"
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
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : sortedNotebooks.length > 0 ? (
          <NotebookGrid
            notebooks={sortedNotebooks}
            viewMode={viewMode}
            onSelectNotebook={onSelectNotebook}
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
