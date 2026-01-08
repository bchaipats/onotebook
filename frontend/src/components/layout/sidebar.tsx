"use client";

import { useState } from "react";
import {
  Settings,
  BookOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import {
  useNotebooks,
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
} from "@/hooks/use-notebooks";
import { OllamaStatus } from "@/components/ollama/ollama-status";
import type { Notebook } from "@/types/api";

const PRESET_COLORS = [
  "#6366f1", // indigo (default)
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

function ColorPalette({ selectedColor, onSelectColor }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
            selectedColor === color
              ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
              : "border-transparent"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onSelectColor(color)}
        />
      ))}
    </div>
  );
}

interface SidebarProps {
  className?: string;
  selectedNotebookId?: string;
  onSelectNotebook?: (notebook: Notebook) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  className,
  selectedNotebookId,
  onSelectNotebook,
  onOpenSettings,
}: SidebarProps) {
  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookColor, setNewNotebookColor] = useState(PRESET_COLORS[0]);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingNotebook, setRenamingNotebook] = useState<Notebook | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [renameColor, setRenameColor] = useState(PRESET_COLORS[0]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNotebook, setDeletingNotebook] = useState<Notebook | null>(
    null
  );

  function handleCreateNotebook() {
    if (!newNotebookName.trim()) return;
    createNotebook.mutate(
      { name: newNotebookName.trim(), color: newNotebookColor },
      {
        onSuccess: () => {
          setNewNotebookName("");
          setNewNotebookColor(PRESET_COLORS[0]);
          setCreateDialogOpen(false);
        },
      }
    );
  }

  function handleRenameNotebook() {
    if (!renamingNotebook || !renameValue.trim()) return;
    updateNotebook.mutate(
      { id: renamingNotebook.id, data: { name: renameValue.trim(), color: renameColor } },
      {
        onSuccess: () => {
          setRenamingNotebook(null);
          setRenameValue("");
          setRenameColor(PRESET_COLORS[0]);
          setRenameDialogOpen(false);
        },
      }
    );
  }

  function handleDeleteNotebook() {
    if (!deletingNotebook) return;
    deleteNotebook.mutate(deletingNotebook.id, {
      onSuccess: () => {
        setDeletingNotebook(null);
        setDeleteDialogOpen(false);
      },
    });
  }

  function openRenameDialog(notebook: Notebook) {
    setRenamingNotebook(notebook);
    setRenameValue(notebook.name);
    setRenameColor(notebook.color || PRESET_COLORS[0]);
    setRenameDialogOpen(true);
  }

  function openDeleteDialog(notebook: Notebook) {
    setDeletingNotebook(notebook);
    setDeleteDialogOpen(true);
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

      {/* Create Notebook Button */}
      <div className="border-b border-border p-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Create Notebook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notebook</DialogTitle>
              <DialogDescription>
                Create a new notebook to organize your documents and
                conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Name
                </label>
                <Input
                  placeholder="Notebook name"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateNotebook();
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Color
                </label>
                <ColorPalette
                  selectedColor={newNotebookColor}
                  onSelectColor={setNewNotebookColor}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNotebook}
                disabled={
                  !newNotebookName.trim() || createNotebook.isPending
                }
              >
                {createNotebook.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notebook list area */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : notebooks && notebooks.length > 0 ? (
          <div className="space-y-1">
            {notebooks.map((notebook) => (
              <NotebookItem
                key={notebook.id}
                notebook={notebook}
                isSelected={selectedNotebookId === notebook.id}
                onSelect={() => onSelectNotebook?.(notebook)}
                onRename={() => openRenameDialog(notebook)}
                onDelete={() => openDeleteDialog(notebook)}
                formatDate={formatRelativeDate}
              />
            ))}
          </div>
        ) : (
          <p className="px-2 text-sm text-muted-foreground">
            Create your first notebook to get started
          </p>
        )}
      </div>

      {/* Ollama status and Settings button */}
      <div className="border-t border-border p-4 space-y-3">
        <OllamaStatus />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Edit Notebook Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notebook</DialogTitle>
            <DialogDescription>
              Update the name and color for this notebook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Name
              </label>
              <Input
                placeholder="Notebook name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameNotebook();
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Color
              </label>
              <ColorPalette
                selectedColor={renameColor}
                onSelectColor={setRenameColor}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameNotebook}
              disabled={!renameValue.trim() || updateNotebook.isPending}
            >
              {updateNotebook.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingNotebook?.name}
              &quot;? This will permanently delete all documents and chat
              sessions in this notebook.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNotebook}
              disabled={deleteNotebook.isPending}
            >
              {deleteNotebook.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

interface NotebookItemProps {
  notebook: Notebook;
  isSelected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

function NotebookItem({
  notebook,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  formatDate,
}: NotebookItemProps) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-accent",
        isSelected && "bg-accent"
      )}
      onClick={onSelect}
    >
      <div
        className="mt-0.5 h-4 w-4 shrink-0 rounded"
        style={{ backgroundColor: notebook.color || "#6366f1" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">{notebook.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {notebook.document_count}
          </span>
          <span>{formatDate(notebook.updated_at)}</span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            <Palette className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
