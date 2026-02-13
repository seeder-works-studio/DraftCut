'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectStore } from '@/stores/project-store';
import { toast } from 'sonner';
import {
  isDiffusionStudiosSupported,
  getRecommendedExportFormat,
  exportWithDiffusionStudios,
} from '@/lib/export/diffusion-renderer';
import {
  isMediaRecorderSupported,
  exportWithMediaRecorder,
} from '@/lib/export/mediarecorder-exporter';
import { loadAsset } from '@/lib/storage/assets';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportMethod = 'webm' | 'diffusion' | 'json';
type ExportQuality = 'low' | 'medium' | 'high' | 'ultra';
type ExportResolution = '0.5' | '1' | '1.5' | '2';

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportMethod, setExportMethod] = useState<ExportMethod>('webm');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [resolution, setResolution] = useState<ExportResolution>('1');
  const [diffusionSupported, setDiffusionSupported] = useState(false);
  const [mediaRecorderSupported, setMediaRecorderSupported] = useState(false);

  const spec = useProjectStore((s) => s.spec);
  const assetBlobUrls = useProjectStore((s) => s.assetBlobUrls);

  useEffect(() => {
    // Check support on mount
    const diffusion = isDiffusionStudiosSupported();
    const mediaRecorder = isMediaRecorderSupported();

    setDiffusionSupported(diffusion);
    setMediaRecorderSupported(mediaRecorder);

    // Default to best available method
    if (diffusion) {
      setExportMethod('diffusion');
    } else if (mediaRecorder) {
      setExportMethod('webm');
    } else {
      setExportMethod('json');
    }
  }, []);

  const handleExportVideo = async () => {
    if (!spec) return;

    setIsExporting(true);
    setProgress(0);

    try {
      // CRITICAL: Ensure all assets are loaded before export
      toast.info('Loading assets...');
      const loadedBlobUrls: Record<string, string> = { ...assetBlobUrls };

      // Load all missing assets
      for (const asset of spec.assets) {
        if (!loadedBlobUrls[asset.id]) {
          console.log(`Loading asset: ${asset.id} (${asset.filename})`);
          const result = await loadAsset(asset.id);
          if (result) {
            const blobUrl = URL.createObjectURL(result.blob);
            loadedBlobUrls[asset.id] = blobUrl;
            console.log(`Asset loaded: ${asset.id} -> ${blobUrl}`);
          } else {
            toast.error(`Failed to load asset: ${asset.filename}`);
            console.error(`Asset not found in IndexedDB: ${asset.id}`);
            return;
          }
        }
      }

      // Verify all required assets are loaded
      const missingAssets: string[] = [];
      for (const asset of spec.assets) {
        if (!loadedBlobUrls[asset.id]) {
          missingAssets.push(asset.filename);
        }
      }

      if (missingAssets.length > 0) {
        toast.error(`Missing assets: ${missingAssets.join(', ')}`);
        console.error('Missing asset blob URLs:', missingAssets);
        return;
      }

      // Update store with loaded blob URLs
      const setAssetBlobUrl = useProjectStore.getState().setAssetBlobUrl;
      for (const [id, url] of Object.entries(loadedBlobUrls)) {
        if (!assetBlobUrls[id]) {
          setAssetBlobUrl(id, url);
        }
      }

      console.log('All assets loaded successfully:', Object.keys(loadedBlobUrls));

      try {
      if (exportMethod === 'webm' && mediaRecorderSupported) {
        // Export with MediaRecorder (WebM, browser-based)
        toast.info('Starting WebM export (YouTube-compatible)...');

        const videoBlob = await exportWithMediaRecorder(
          { spec, assetBlobUrls: loadedBlobUrls },
          {
            quality: quality as 'low' | 'medium' | 'high',
            onProgress: (p) => setProgress(p * 100),
          }
        );

        // Download the WebM
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `draftcut-video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Video exported! Ready for YouTube upload.');
        onOpenChange(false);
      } else if (exportMethod === 'diffusion' && diffusionSupported) {
        // Export with Diffusion Studios (MP4, hardware-accelerated)
        toast.info('Starting MP4 export with hardware acceleration...');

        const videoBlob = await exportWithDiffusionStudios(
          { spec, assetBlobUrls: loadedBlobUrls },
          {
            quality: quality as 'low' | 'medium' | 'high' | 'ultra',
            format: 'mp4',
            resolution: parseFloat(resolution),
            onProgress: (p) => setProgress(p * 100),
          }
        );

        // Download the MP4
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `draftcut-video-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Video exported successfully!');
        onOpenChange(false);
      } else {
        // Fallback to JSON export
        await handleExportJSON();
      }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed';
        toast.error(message);
        console.error('Export error:', err);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load assets';
      toast.error(message);
      console.error('Asset loading error:', err);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleExportJSON = async () => {
    if (!spec) return;

    try {
      const json = JSON.stringify(spec, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `draftcut-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Project exported as JSON');
      onOpenChange(false);
    } catch (err) {
      toast.error('JSON export failed');
    }
  };

  const recommended = getRecommendedExportFormat();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Choose your export format and quality settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Info */}
          {spec && (
            <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted rounded-lg">
              <p><strong>Canvas:</strong> {spec.canvas.width}x{spec.canvas.height}</p>
              <p><strong>Duration:</strong> {spec.canvas.duration}s @ {spec.canvas.fps}fps</p>
              <p>
                <strong>Tracks:</strong> {spec.composition.tracks.length} |
                <strong> Clips:</strong> {spec.composition.tracks.reduce((sum, t) => sum + t.clips.length, 0)}
              </p>
            </div>
          )}

          {/* Export Method */}
          <div className="space-y-2">
            <Label>Export Method</Label>
            <Select
              value={exportMethod}
              onValueChange={(v) => setExportMethod(v as ExportMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webm" disabled={!mediaRecorderSupported}>
                  WebM Video (YouTube-Compatible) {mediaRecorderSupported && '✓ Recommended'}
                  {!mediaRecorderSupported && ' - Not Available'}
                </SelectItem>
                <SelectItem value="diffusion" disabled={!diffusionSupported}>
                  MP4 Video (Diffusion Studios - Premium)
                  {!diffusionSupported && ' - Not Available'}
                </SelectItem>
                <SelectItem value="json">
                  JSON Project File
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Support Status */}
            {exportMethod === 'webm' && (
              <div className="text-xs space-y-1">
                {mediaRecorderSupported ? (
                  <div className="text-green-600 dark:text-green-400 space-y-1">
                    <p>✓ WebM export available</p>
                    <p className="text-muted-foreground">
                      Works on YouTube, Chrome, Firefox, Edge. Safari requires conversion.
                    </p>
                  </div>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ Your browser doesn't support MediaRecorder API
                  </p>
                )}
              </div>
            )}
            {exportMethod === 'diffusion' && (
              <div className="text-xs space-y-1">
                {diffusionSupported ? (
                  <div className="space-y-1">
                    <p className="text-amber-600 dark:text-amber-400">
                      ⚠️ MP4 export is experimental and may have color compatibility issues
                    </p>
                    <p className="text-muted-foreground">
                      For best results, use WebM export instead. MP4 export with Diffusion Studios is still in development.
                    </p>
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400 space-y-1">
                    <p>⚠️ Diffusion Studios requires:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>WebCodecs API support</li>
                      <li>CORS headers (deployed sites only)</li>
                    </ul>
                    <p className="text-muted-foreground mt-1">
                      Run <code className="bg-muted px-1 rounded">npm run deploy</code> to enable.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quality Settings (only for video export) */}
          {(exportMethod === 'webm' || exportMethod === 'diffusion') && (
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select
                value={quality}
                onValueChange={(v) => setQuality(v as ExportQuality)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Fast, 2 Mbps)</SelectItem>
                  <SelectItem value="medium">Medium (5 Mbps)</SelectItem>
                  <SelectItem value="high">High (10 Mbps) ✓ Recommended</SelectItem>
                  {exportMethod === 'diffusion' && (
                    <SelectItem value="ultra">Ultra (25 Mbps, best quality)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resolution/Scale Settings (only for Diffusion) */}
          {exportMethod === 'diffusion' && spec && (
            <div className="space-y-2">
              <Label>Resolution Scale</Label>
              <Select
                value={resolution}
                onValueChange={(v) => setResolution(v as ExportResolution)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">
                    0.5x (Half - {Math.round(spec.canvas.width * 0.5)}x{Math.round(spec.canvas.height * 0.5)})
                  </SelectItem>
                  <SelectItem value="1">
                    1x (Native - {spec.canvas.width}x{spec.canvas.height}) ✓ Recommended
                  </SelectItem>
                  <SelectItem value="1.5">
                    1.5x ({Math.round(spec.canvas.width * 1.5)}x{Math.round(spec.canvas.height * 1.5)})
                  </SelectItem>
                  <SelectItem value="2">
                    2x (4K - {spec.canvas.width * 2}x{spec.canvas.height * 2})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher resolution = larger file size and slower export
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={exportMethod === 'json' ? handleExportJSON : handleExportVideo}
              disabled={
                isExporting ||
                (exportMethod === 'webm' && !mediaRecorderSupported) ||
                (exportMethod === 'diffusion' && !diffusionSupported)
              }
            >
              {isExporting
                ? 'Exporting...'
                : exportMethod === 'json'
                ? 'Export JSON'
                : exportMethod === 'webm'
                ? 'Export WebM'
                : 'Export MP4'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
