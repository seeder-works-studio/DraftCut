import { create } from 'zustand';
import type { Asset, ProjectSpec, Clip } from '@/lib/spec/types';

interface ProjectState {
  spec: ProjectSpec | null;
  assets: Asset[];
  assetBlobUrls: Record<string, string>; // assetId -> blob URL
  isGenerating: boolean;

  setSpec: (spec: ProjectSpec) => void;
  updateSpec: (updater: (spec: ProjectSpec) => ProjectSpec) => void;
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setAssetBlobUrl: (assetId: string, url: string) => void;
  setAssetBlobUrls: (urls: Record<string, string>) => void;
  revokeAllBlobUrls: () => void;

  updateClip: (clipId: string, updates: Partial<Clip>) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  spec: null,
  assets: [],
  assetBlobUrls: {},
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

  removeAsset: (id) => {
    const url = get().assetBlobUrls[id];
    if (url) URL.revokeObjectURL(url);
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      assetBlobUrls: Object.fromEntries(
        Object.entries(state.assetBlobUrls).filter(([k]) => k !== id)
      ),
    }));
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setAssetBlobUrl: (assetId, url) =>
    set((state) => ({
      assetBlobUrls: { ...state.assetBlobUrls, [assetId]: url },
    })),

  setAssetBlobUrls: (urls) => set({ assetBlobUrls: urls }),

  revokeAllBlobUrls: () => {
    const urls = get().assetBlobUrls;
    Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    set({ assetBlobUrls: {} });
  },

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
