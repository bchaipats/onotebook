"use client";

import { useState } from "react";
import { FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUpdateNotebook, useDeleteNotebook } from "@/hooks/use-notebooks";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/types/api";

const PRESET_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface NotebookCardProps {
  notebook: Notebook;
  onSelect: () => void;
  style?: React.CSSProperties;
}

export function NotebookCard({ notebook, onSelect, style }: NotebookCardProps) {
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState(notebook.name);
  const [editColor, setEditColor] = useState(notebook.color || PRESET_COLORS[0]);

  function handleEdit() {
    if (!editName.trim()) return;
    updateNotebook.mutate(
      { id: notebook.id, data: { name: editName.trim(), color: editColor } },
      { onSuccess: () => setEditDialogOpen(false) }
    );
  }

  function handleDelete() {
    deleteNotebook.mutate(notebook.id, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  }

  return (
    <>
      <div
        className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg animate-slide-in-bottom"
        onClick={onSelect}
        style={style}
      >
        {/* Color accent header */}
        <div
          className="h-28 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: notebook.color || "#6366f1" }}
        />

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-1 truncate text-base font-semibold">
            {notebook.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {notebook.document_count} sources
            </span>
            <span>{formatRelativeDate(notebook.updated_at)}</span>
          </div>
        </div>

        {/* Hover actions */}
        <div className="absolute right-3 top-3 translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(notebook.name);
                  setEditColor(notebook.color || PRESET_COLORS[0]);
                  setEditDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notebook</DialogTitle>
            <DialogDescription>
              Update the name and color for this notebook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      editColor === color
                        ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editName.trim() || updateNotebook.isPending}
            >
              {updateNotebook.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{notebook.name}&quot;? This
              will permanently delete all documents and chat sessions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNotebook.isPending}
            >
              {deleteNotebook.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
