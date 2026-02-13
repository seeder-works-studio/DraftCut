import { create } from 'zustand';
import type { Asset, ProjectSpec, Clip } from '@/lib/spec/types';
import { logger } from '@/lib/logger';

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

  setSpec: (spec) => {
    logger.info('ProjectStore', 'Setting project spec', {
      hasCanvas: !!spec.canvas,
      trackCount: spec.composition?.tracks?.length || 0,
      duration: spec.canvas?.duration,
    });
    set({ spec });
  },

  updateSpec: (updater) => {
    const current = get().spec;
    if (current) {
      logger.debug('ProjectStore', 'Updating project spec');
      const updated = updater(current);
      set({ spec: updated });
      logger.debug('ProjectStore', 'Project spec updated', {
        duration: updated.canvas?.duration,
      });
    } else {
      logger.warn('ProjectStore', 'updateSpec called but no current spec');
    }
  },

  setAssets: (assets) => {
    logger.info('ProjectStore', 'Setting assets', {
      assetCount: assets.length,
      assetTypes: assets.map((a) => a.type),
    });
    set({ assets });
  },

  addAsset: (asset) => {
    logger.info('ProjectStore', 'Adding asset', {
      assetId: asset.id,
      assetType: asset.type,
      filename: asset.filename,
    });
    set((state) => ({ assets: [...state.assets, asset] }));
  },

  removeAsset: (id) => {
    logger.info('ProjectStore', 'Removing asset', { assetId: id });
    const url = get().assetBlobUrls[id];
    if (url) {
      logger.debug('ProjectStore', 'Revoking blob URL', { assetId: id });
      URL.revokeObjectURL(url);
    }
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
      assetBlobUrls: Object.fromEntries(
        Object.entries(state.assetBlobUrls).filter(([k]) => k !== id)
      ),
    }));
  },

  setIsGenerating: (isGenerating) => {
    logger.info('ProjectStore', `Generation ${isGenerating ? 'started' : 'completed'}`);
    set({ isGenerating });
  },

  setAssetBlobUrl: (assetId, url) => {
    logger.debug('ProjectStore', 'Setting blob URL for asset', { assetId });
    set((state) => ({
      assetBlobUrls: { ...state.assetBlobUrls, [assetId]: url },
    }));
  },

  setAssetBlobUrls: (urls) => {
    logger.info('ProjectStore', 'Setting multiple blob URLs', {
      urlCount: Object.keys(urls).length,
    });
    set({ assetBlobUrls: urls });
  },

  revokeAllBlobUrls: () => {
    logger.info('ProjectStore', 'Revoking all blob URLs');
    const urls = get().assetBlobUrls;
    Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    set({ assetBlobUrls: {} });
  },

  updateClip: (clipId, updates) => {
    const spec = get().spec;
    if (!spec) {
      logger.warn('ProjectStore', 'updateClip called but no current spec');
      return;
    }

    logger.debug('ProjectStore', 'Updating clip', { clipId, updates });
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
