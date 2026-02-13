import { create } from 'zustand';
import { logger } from '@/lib/logger';

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

  setCurrentTime: (currentTime) => {
    logger.debug('EditorStore', 'Setting current time', { time: currentTime.toFixed(2) });
    set({ currentTime });
  },
  setIsPlaying: (isPlaying) => {
    logger.info('EditorStore', `Playback ${isPlaying ? 'started' : 'paused'}`);
    set({ isPlaying });
  },
  togglePlayback: () => {
    set((s) => {
      logger.info('EditorStore', `Playback toggled to ${!s.isPlaying ? 'play' : 'pause'}`);
      return { isPlaying: !s.isPlaying };
    });
  },
  setSelectedClipId: (selectedClipId) => {
    logger.debug('EditorStore', 'Selected clip changed', { clipId: selectedClipId });
    set({ selectedClipId });
  },
  setPixelsPerSecond: (pixelsPerSecond) => {
    logger.debug('EditorStore', 'Timeline zoom changed', { pixelsPerSecond });
    set({ pixelsPerSecond });
  },
}));
