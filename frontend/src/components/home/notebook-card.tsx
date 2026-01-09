"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import type { Notebook } from "@/types/api";

interface NotebookCardProps {
  notebook: Notebook;
  onSelect: () => void;
}

export function NotebookCard({ notebook, onSelect }: NotebookCardProps) {
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState(notebook.name);

  function handleEdit() {
    if (!editName.trim()) return;
    updateNotebook.mutate(
      { id: notebook.id, data: { name: editName.trim() } },
      { onSuccess: () => setEditDialogOpen(false) },
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
        className="group relative cursor-pointer rounded-xl bg-card-notebook p-8 shadow-md transition-all duration-200 hover:shadow-lg"
        onClick={onSelect}
      >
        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(notebook.name);
                  setEditDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
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

        <div className="mb-8">
          <NotebookIcon />
        </div>

        <h3 className="mb-2 line-clamp-1 text-xl font-medium text-foreground">
          {notebook.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(notebook.updated_at)} · {notebook.document_count} sources
        </p>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename notebook</DialogTitle>
            <DialogDescription>
              Enter a new name for this notebook.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              autoFocus
            />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete notebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{notebook.name}&quot;? This
              will permanently delete all documents and chat sessions.
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

function NotebookIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V12Z"
        fill="#D4A853"
      />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H32L40 14V38C40 40.2091 38.2091 42 36 42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="#F5C869"
      />
      <path d="M32 6V14H40L32 6Z" fill="#D4A853" />
      <path
        d="M8 10C8 7.79086 9.79086 6 12 6H14V42H12C9.79086 42 8 40.2091 8 38V10Z"
        fill="#E8B84A"
      />
    </svg>
  );
}
