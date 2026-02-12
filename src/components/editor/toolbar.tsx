'use client';

import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { usePlayback } from '@/hooks/use-playback';

interface ToolbarProps {
  onExport: () => void;
  onBack: () => void;
}

export function Toolbar({ onExport, onBack }: ToolbarProps) {
  const { isPlaying, currentTime, duration, setIsPlaying, setCurrentTime } =
    usePlayback();

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const frames = Math.floor((t % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2 bg-card">
      <Button variant="ghost" size="sm" onClick={onBack}>
        Back
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentTime(0)}
      >
        |&lt;
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>

      <span className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={onExport}>
        Export
      </Button>
    </div>
  );
}
