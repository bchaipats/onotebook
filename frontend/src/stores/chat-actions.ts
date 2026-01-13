import { create } from "zustand";

interface ChatActionsState {
  pendingMessage: string | null;
  setPendingMessage: (message: string | null) => void;
}

export const useChatActions = create<ChatActionsState>((set) => ({
  pendingMessage: null,
  setPendingMessage: (message) => set({ pendingMessage: message }),
}));
