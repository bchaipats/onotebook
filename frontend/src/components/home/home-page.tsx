"use client";

import { useState, useMemo } from "react";
import { HomeHeader } from "./home-header";
import { NotebookGrid } from "./notebook-grid";
import { EmptyState } from "./empty-state";
import { useNotebooks, useCreateNotebook } from "@/hooks/use-notebooks";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, LayoutGrid, List, ChevronDown, Check } from "lucide-react";
import type { Notebook } from "@/types/api";

interface HomePageProps {
  onSelectNotebook: (notebook: Notebook, isNewlyCreated?: boolean) => void;
  onOpenSettings: () => void;
}

export function HomePage({ onSelectNotebook, onOpenSettings }: HomePageProps) {
  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();

  const [filter, setFilter] = useState<"all" | "recent">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

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

  function handleCreateNotebook() {
    createNotebook.mutate(
      { name: "Untitled notebook" },
      {
        onSuccess: (notebook) => {
          onSelectNotebook(notebook, true);
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader onOpenSettings={onOpenSettings} />

      <main className="mx-auto max-w-5xl px-6 py-6 md:px-8 md:py-8">
        <h1 className="mb-8 text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          Welcome to ONotebook
        </h1>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            variant="pill"
            value={filter}
            onValueChange={(value) =>
              value && setFilter(value as "all" | "recent")
            }
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="recent">Recent</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              value={viewMode}
              onValueChange={(value) =>
                value && setViewMode(value as "grid" | "list")
              }
            >
              <ToggleGroupItem value="grid">
                {viewMode === "grid" && <Check className="h-4 w-4" />}
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list">
                {viewMode === "list" && <Check className="h-4 w-4" />}
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="pill" className="text-primary">
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

            <Button
              size="pill"
              onClick={handleCreateNotebook}
              disabled={createNotebook.isPending}
            >
              <Plus className="h-4 w-4" />
              Create new
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sortedNotebooks.length > 0 ? (
          <NotebookGrid
            notebooks={sortedNotebooks}
            viewMode={viewMode}
            onSelectNotebook={onSelectNotebook}
            onCreateNotebook={handleCreateNotebook}
          />
        ) : (
          <EmptyState onCreateNotebook={handleCreateNotebook} />
        )}
      </main>
    </div>
  );
}
