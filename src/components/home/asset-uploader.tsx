'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { saveAsset } from '@/lib/storage/assets';
import { useProjectStore } from '@/stores/project-store';
import { useAutoVideoAnalysis } from '@/hooks/use-auto-video-analysis';
import { toast } from 'sonner';
import type { Asset } from '@/lib/spec/types';

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export function AssetUploader() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addAsset = useProjectStore((s) => s.addAsset);
  const setAssetBlobUrl = useProjectStore((s) => s.setAssetBlobUrl);
  const { analyzeVideo } = useAutoVideoAnalysis();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsUploading(true);
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`Unsupported file type: ${file.name}`);
          continue;
        }

        try {
          const asset = await saveAsset(file);
          addAsset(asset);
          // Create blob URL immediately so it's available in the editor
          const blobUrl = URL.createObjectURL(file);
          setAssetBlobUrl(asset.id, blobUrl);
          toast.success(`Added ${file.name}`);

          // Auto-analyze videos (runs in background)
          if (file.type.startsWith('video/')) {
            analyzeVideo(file, asset.id).catch((err) => {
              console.error('Video analysis error:', err);
            });
          }
        } catch {
          toast.error(`Failed to add ${file.name}`);
        }
      }
      setIsUploading(false);
    },
    [addAsset, setAssetBlobUrl, analyzeVideo]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <Card
      className={`relative border-2 border-dashed p-8 text-center transition-colors ${
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl">
          {isUploading ? '...' : '+'}
        </div>
        <p className="text-sm text-muted-foreground">
          Drag & drop video, image, or audio files here
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Adding...' : 'Browse Files'}
        </Button>
      </div>
    </Card>
  );
}

export function AssetList() {
  const assets = useProjectStore((s) => s.assets);
  const removeAsset = useProjectStore((s) => s.removeAsset);

  if (assets.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Assets ({assets.length})</h3>
      <div className="grid gap-2">
        {assets.map((asset) => (
          <AssetItem
            key={asset.id}
            asset={asset}
            onRemove={() => removeAsset(asset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AssetItem({
  asset,
  onRemove,
}: {
  asset: Asset;
  onRemove: () => void;
}) {
  const typeIcon =
    asset.type === 'video' ? 'V' : asset.type === 'audio' ? 'A' : 'I';

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs font-bold">
        {typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">
          {asset.type}
          {asset.duration ? ` | ${asset.duration.toFixed(1)}s` : ''}
          {asset.width && asset.height
            ? ` | ${asset.width}x${asset.height}`
            : ''}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        x
      </Button>
    </div>
  );
}
