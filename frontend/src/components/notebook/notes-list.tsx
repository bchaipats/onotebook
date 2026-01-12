"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { Note } from "@/types/api";

interface NotesListProps {
  notes: Note[];
  onUpdate: (noteId: string, title?: string, content?: string) => void;
  onDelete: (noteId: string) => void;
}

export function NotesList({ notes, onUpdate, onDelete }: NotesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  function startEditing(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title || "");
    setEditContent(note.content);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }

  function saveEditing(noteId: string) {
    onUpdate(noteId, editTitle || undefined, editContent);
    cancelEditing();
  }

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="px-1 text-xs font-medium text-on-surface-muted">Notes</h3>
      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg bg-surface-variant p-3 text-sm text-on-surface"
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <Input
                  placeholder="Title (optional)"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-sm"
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={cancelEditing}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => saveEditing(note.id)}
                    disabled={!editContent.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {note.title && (
                  <div className="mb-1 font-medium text-on-surface">
                    {note.title}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-on-surface-muted">
                  {note.content}
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEditing(note)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AddNoteFormProps {
  onAdd: (content: string, title?: string) => void;
  onCancel: () => void;
}

export function AddNoteForm({ onAdd, onCancel }: AddNoteFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function handleSubmit() {
    if (content.trim()) {
      onAdd(content.trim(), title.trim() || undefined);
      setTitle("");
      setContent("");
    }
  }

  return (
    <div className="space-y-2 rounded-lg bg-surface-variant p-3">
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
      />
      <Textarea
        placeholder="Write a note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px] resize-none text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
