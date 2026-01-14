import { create } from "zustand";

import type { GenerationStatus } from "@/types/api";

export interface Task {
  id: string;
  type: string;
  status: GenerationStatus;
  progress: number;
  notebookId: string;
  error: string | null;
}

interface TaskActions {
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

interface TaskStore {
  tasks: Map<string, Task>;
  actions: TaskActions;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: new Map(),

  actions: {
    addTask: (task) =>
      set((state) => {
        const tasks = new Map(state.tasks);
        tasks.set(task.id, task);
        return { tasks };
      }),

    updateTask: (id, updates) =>
      set((state) => {
        const task = state.tasks.get(id);
        if (!task) return state;
        const tasks = new Map(state.tasks);
        tasks.set(id, { ...task, ...updates });
        return { tasks };
      }),

    removeTask: (id) =>
      set((state) => {
        const tasks = new Map(state.tasks);
        tasks.delete(id);
        return { tasks };
      }),
  },
}));

export const useTaskActions = () => useTaskStore((s) => s.actions);

export function useActiveTask(notebookId: string, type: string): Task | null {
  return useTaskStore((state) => {
    for (const task of state.tasks.values()) {
      if (
        task.notebookId === notebookId &&
        task.type === type &&
        (task.status === "pending" || task.status === "processing")
      ) {
        return task;
      }
    }
    return null;
  });
}
