import { create } from 'zustand';
import type { Asset, BrandKit, ProjectSpec, Clip } from '@/lib/spec/types';

interface ProjectState {
  spec: ProjectSpec | null;
  assets: Asset[];
  isGenerating: boolean;

  setSpec: (spec: ProjectSpec) => void;
  updateSpec: (updater: (spec: ProjectSpec) => ProjectSpec) => void;
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  setIsGenerating: (generating: boolean) => void;

  updateClip: (clipId: string, updates: Partial<Clip>) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  spec: null,
  assets: [],
  isGenerating: false,

  setSpec: (spec) => set({ spec }),

  updateSpec: (updater) => {
    const current = get().spec;
    if (current) {
      set({ spec: updater(current) });
    }
  },

  setAssets: (assets) => set({ assets }),

  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),

  removeAsset: (id) =>
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  updateClip: (clipId, updates) => {
    const spec = get().spec;
    if (!spec) return;

    const newSpec = {
      ...spec,
      composition: {
        ...spec.composition,
        tracks: spec.composition.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === clipId ? { ...clip, ...updates } : clip
          ),
        })),
      },
    };
    set({ spec: newSpec });
  },
}));
