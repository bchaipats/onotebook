import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export interface HighlightedCitation {
  documentId: string;
  documentName: string;
  chunkContent: string;
  citationIndex: number;
}

interface NotebookActions {
  resetForNotebook: () => void;
  setSelectedSources: (sources: Set<string>) => void;
  toggleSource: (sourceId: string) => void;
  setSourcesCollapsed: (collapsed: boolean) => void;
  setStudioCollapsed: (collapsed: boolean) => void;
  viewSourceDetail: (documentId: string) => void;
  closeSourceDetail: () => void;
  highlightCitation: (citation: HighlightedCitation) => void;
  clearHighlightedCitation: () => void;
  askInChat: (message: string) => void;
  consumePendingChatMessage: () => string | null;
}

interface NotebookStore {
  selectedSources: Set<string>;
  sourcesCollapsed: boolean;
  studioCollapsed: boolean;
  isViewingSourceDetail: boolean;
  viewedSourceId: string | null;
  highlightedCitation: HighlightedCitation | null;
  pendingChatMessage: string | null;
  actions: NotebookActions;
}

const INITIAL_STATE = {
  selectedSources: new Set<string>(),
  sourcesCollapsed: false,
  studioCollapsed: false,
  isViewingSourceDetail: false,
  viewedSourceId: null as string | null,
  highlightedCitation: null as HighlightedCitation | null,
  pendingChatMessage: null as string | null,
};

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  ...INITIAL_STATE,

  actions: {
    resetForNotebook: () =>
      set({
        selectedSources: new Set(),
        sourcesCollapsed: false,
        studioCollapsed: false,
        isViewingSourceDetail: false,
        viewedSourceId: null,
        highlightedCitation: null,
        pendingChatMessage: null,
      }),

    setSelectedSources: (sources) => set({ selectedSources: sources }),

    toggleSource: (sourceId) =>
      set((state) => {
        const next = new Set(state.selectedSources);
        if (next.has(sourceId)) {
          next.delete(sourceId);
        } else {
          next.add(sourceId);
        }
        return { selectedSources: next };
      }),

    setSourcesCollapsed: (collapsed) => set({ sourcesCollapsed: collapsed }),
    setStudioCollapsed: (collapsed) => set({ studioCollapsed: collapsed }),

    viewSourceDetail: (documentId) =>
      set({ isViewingSourceDetail: true, viewedSourceId: documentId }),

    closeSourceDetail: () =>
      set({
        isViewingSourceDetail: false,
        viewedSourceId: null,
        highlightedCitation: null,
      }),

    highlightCitation: (citation) =>
      set({
        highlightedCitation: citation,
        isViewingSourceDetail: true,
        viewedSourceId: citation.documentId,
        sourcesCollapsed: false,
      }),

    clearHighlightedCitation: () => set({ highlightedCitation: null }),

    askInChat: (message) => set({ pendingChatMessage: message }),

    consumePendingChatMessage: () => {
      const message = get().pendingChatMessage;
      if (message) {
        set({ pendingChatMessage: null });
      }
      return message;
    },
  },
}));

export const useSelectedSources = () =>
  useNotebookStore(useShallow((s) => s.selectedSources));
export const useSourcesCollapsed = () =>
  useNotebookStore((s) => s.sourcesCollapsed);
export const useStudioCollapsed = () =>
  useNotebookStore((s) => s.studioCollapsed);
export const useIsViewingSourceDetail = () =>
  useNotebookStore((s) => s.isViewingSourceDetail);
export const useViewedSourceId = () =>
  useNotebookStore((s) => s.viewedSourceId);
export const useHighlightedCitation = () =>
  useNotebookStore((s) => s.highlightedCitation);
export const usePendingChatMessage = () =>
  useNotebookStore((s) => s.pendingChatMessage);
export const useNotebookActions = () => useNotebookStore((s) => s.actions);
