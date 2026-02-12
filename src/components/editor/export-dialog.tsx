'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjectStore } from '@/stores/project-store';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const spec = useProjectStore((s) => s.spec);

  const handleExport = async () => {
    if (!spec) return;

    setIsExporting(true);
    setProgress(0);

    try {
      // For now, export the project spec as JSON
      const json = JSON.stringify(spec, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `draftcut-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('Project exported as JSON');
      onOpenChange(false);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {spec && (
            <div className="text-sm text-muted-foreground">
              <p>Canvas: {spec.canvas.width}x{spec.canvas.height}</p>
              <p>Duration: {spec.canvas.duration}s @ {spec.canvas.fps}fps</p>
              <p>
                Tracks: {spec.composition.tracks.length} |
                Clips: {spec.composition.tracks.reduce((sum, t) => sum + t.clips.length, 0)}
              </p>
            </div>
          )}

          {isExporting && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
