import { v4 as uuidv4 } from 'uuid';
import { getDB } from './db';
import type { Asset } from '@/lib/spec/types';
import { extractImageColors } from '@/lib/utils/color-extraction';

function detectAssetType(mimeType: string): 'video' | 'audio' | 'image' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'image';
}

function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(
      file.type.startsWith('video') ? 'video' : 'audio'
    );
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(el.duration);
      URL.revokeObjectURL(el.src);
    };
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });
}

function getMediaDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('video')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    } else {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    }
  });
}

export async function saveAsset(file: File): Promise<Asset> {
  const db = await getDB();
  const id = uuidv4();

  const metadata: Asset = {
    id,
    type: detectAssetType(file.type),
    filename: file.name,
  };

  if (metadata.type === 'video' || metadata.type === 'audio') {
    metadata.duration = await getMediaDuration(file);
  }

  if (metadata.type === 'video' || metadata.type === 'image') {
    const dims = await getMediaDimensions(file);
    metadata.width = dims.width;
    metadata.height = dims.height;
  }

  // Extract dominant colors from images
  if (metadata.type === 'image') {
    try {
      metadata.colors = await extractImageColors(file);
    } catch (error) {
      console.warn('Failed to extract image colors:', error);
      metadata.colors = [];
    }
  }

  await db.put('assets', { id, blob: file, metadata });
  return metadata;
}

export async function loadAsset(
  id: string
): Promise<{ blob: Blob; metadata: Asset } | undefined> {
  const db = await getDB();
  const record = await db.get('assets', id);
  if (!record) return undefined;
  return { blob: record.blob, metadata: record.metadata };
}

export async function loadAssetBlob(id: string): Promise<Blob | undefined> {
  const result = await loadAsset(id);
  return result?.blob;
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('assets', id);
}

export async function listAssets(): Promise<Asset[]> {
  const db = await getDB();
  const all = await db.getAll('assets');
  return all.map((r) => r.metadata);
}
