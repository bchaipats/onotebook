"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSearchSources, useAddSourcesFromSearch } from "@/hooks/use-sources";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/types/api";

interface SourceSearchProps {
  notebookId: string;
}

type SearchMode = "fast" | "deep";

export function SourceSearch({ notebookId }: SourceSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("fast");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  const search = useSearchSources(notebookId);
  const addSources = useAddSourcesFromSearch(notebookId);

  function handleSearch() {
    if (!query.trim()) return;

    search.mutate(
      { query: query.trim(), mode },
      {
        onSuccess: (data) => {
          setResults(data.results);
          setSelectedUrls(new Set());
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  function toggleResult(url: string) {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedUrls(newSelection);
  }

  function handleAddSources() {
    if (selectedUrls.size === 0) return;

    addSources.mutate(Array.from(selectedUrls), {
      onSuccess: () => {
        setResults([]);
        setSelectedUrls(new Set());
        setQuery("");
      },
    });
  }

  function handleClearResults() {
    setResults([]);
    setSelectedUrls(new Set());
  }

  const isSearching = search.isPending;
  const isAdding = addSources.isPending;

  return (
    <div className="rounded-xl p-3">
      <div className="flex items-center gap-2 rounded-lg px-3 py-2">
        <Search className="h-4 w-4" />
        <input
          type="text"
          placeholder="Search the web for new sources"
          className="flex-1 text-sm outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSearching || isAdding}
        />
        {isSearching && (
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-muted" />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors",
                  mode === "deep" ? "" : "",
                )}
              >
                <Sparkles className="h-3 w-3" />
                {mode === "fast" ? "Fast Research" : "Deep Research"}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setMode("fast")}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">Fast Research</span>
                  <span className="text-xs">Quick search, 10 results</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("deep")}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">Deep Research</span>
                  <span className="text-xs">
                    Comprehensive search, 30 results
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={handleSearch}
          disabled={!query.trim() || isSearching || isAdding}
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {search.error && (
        <p className="mt-2 text-xs">
          {search.error instanceof Error
            ? search.error.message
            : "Search failed. Make sure BRAVE_SEARCH_API_KEY is configured."}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">{results.length} results found</span>
            <button onClick={handleClearResults} className="text-xs">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-60 space-y-1 overflow-y-auto">
            {results.map((result) => (
              <SearchResultRow
                key={result.id}
                result={result}
                isSelected={selectedUrls.has(result.url)}
                onToggle={() => toggleResult(result.url)}
              />
            ))}
          </div>

          {selectedUrls.size > 0 && (
            <Button
              onClick={handleAddSources}
              className="w-full gap-2"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-on-primary" />
                  Adding sources...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Add {selectedUrls.size} source
                  {selectedUrls.size > 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({
  result,
  isSelected,
  onToggle,
}: {
  result: SearchResultItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg p-2 transition-colors",
        isSelected ? "" : "",
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5 rounded"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {result.favicon_url && (
            <img
              src={result.favicon_url}
              alt=""
              className="h-4 w-4 shrink-0 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="truncate text-sm font-medium">{result.title}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs">{result.snippet}</p>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-xs hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{result.url}</span>
        </a>
      </div>
    </div>
  );
}
