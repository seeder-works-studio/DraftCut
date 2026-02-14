'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { loadAsset } from '@/lib/storage/assets';

/**
 * Loads asset blobs from IndexedDB and creates blob URLs for playback.
 * Call this in the editor page to make uploaded videos/audio/images available.
 */
export function useAssetLoader() {
  const spec = useProjectStore((s) => s.spec);
  const assetBlobUrls = useProjectStore((s) => s.assetBlobUrls);
  const setAssetBlobUrl = useProjectStore((s) => s.setAssetBlobUrl);
  const revokeAllBlobUrls = useProjectStore((s) => s.revokeAllBlobUrls);

  useEffect(() => {
    if (!spec) return;

    const assetIds = spec.assets.map((a) => a.id);

    // Load any assets that don't have blob URLs yet
    for (const assetId of assetIds) {
      if (assetBlobUrls[assetId]) continue;

      loadAsset(assetId).then((result) => {
        if (result) {
          const url = URL.createObjectURL(result.blob);
          setAssetBlobUrl(assetId, url);
        }
      });
    }

    // Note: Don't revoke blob URLs when assets change - they might still be in use
    // Cleanup only happens when component unmounts (empty dependency array below)
  }, [spec?.assets, assetBlobUrls, setAssetBlobUrl]);

  // Cleanup ONLY on component unmount
  useEffect(() => {
    return () => {
      revokeAllBlobUrls();
    };
  }, [revokeAllBlobUrls]);
}
