import { create } from 'zustand';

interface EditorState {
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  pixelsPerSecond: number;

  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setSelectedClipId: (id: string | null) => void;
  setPixelsPerSecond: (pps: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  pixelsPerSecond: 100,

  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSelectedClipId: (selectedClipId) => set({ selectedClipId }),
  setPixelsPerSecond: (pixelsPerSecond) => set({ pixelsPerSecond }),
}));
