'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import type { Track, Clip } from '@/lib/spec/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const TRACK_HEIGHT = 48;
const MIN_ZOOM = 20; // pixels per second
const MAX_ZOOM = 200;
const DEFAULT_ZOOM = 100;

const TRACK_COLORS: Record<string, string> = {
  video: 'bg-blue-600/70',
  overlay: 'bg-purple-600/70',
  audio: 'bg-green-600/70',
};

const SKILL_COLORS: Record<string, string> = {
  IntroTitleCard: 'bg-amber-500/80',
  LowerThird: 'bg-sky-500/80',
  CaptionsPop: 'bg-pink-500/80',
  CalloutBoxArrow: 'bg-red-500/80',
  OutroCTA: 'bg-emerald-500/80',
  ImageSlideshow: 'bg-violet-500/80',
  TextReveal: 'bg-fuchsia-500/80',
};

export function Timeline() {
  const spec = useProjectStore((s) => s.spec);
  const { currentTime, setCurrentTime, pixelsPerSecond, setPixelsPerSecond, selectedClipId, setSelectedClipId } =
    useEditorStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, scrollLeft: 0 });

  // Fit timeline to window
  const fitToWindow = useCallback(() => {
    if (!spec || !timelineRef.current) return;
    const containerWidth = timelineRef.current.clientWidth;
    const newPps = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (containerWidth - 100) / spec.canvas.duration));
    setPixelsPerSecond(newPps);
  }, [spec, setPixelsPerSecond]);

  // Zoom in/out
  const zoomIn = useCallback(() => {
    setPixelsPerSecond(Math.min(MAX_ZOOM, pixelsPerSecond + 10));
  }, [pixelsPerSecond, setPixelsPerSecond]);

  const zoomOut = useCallback(() => {
    setPixelsPerSecond(Math.max(MIN_ZOOM, pixelsPerSecond - 10));
  }, [pixelsPerSecond, setPixelsPerSecond]);

  // Handle scroll wheel zoom (Ctrl/Cmd + scroll)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!timelineRef.current?.contains(e.target as Node)) return;
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setPixelsPerSecond(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pixelsPerSecond + delta)));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [pixelsPerSecond, setPixelsPerSecond]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if timeline is focused or no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        fitToWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, fitToWindow]);

  // Handle panning with Space + drag or Middle mouse button
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    // Middle mouse button or Space + left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        scrollLeft: timelineRef.current.scrollLeft,
      });
      timelineRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !timelineRef.current) return;

    const dx = e.clientX - panStart.x;
    timelineRef.current.scrollLeft = panStart.scrollLeft - dx;
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    if (isPanning && timelineRef.current) {
      setIsPanning(false);
      timelineRef.current.style.cursor = '';
    }
  }, [isPanning]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current || !spec || isPanning) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const time = Math.max(0, Math.min(x / pixelsPerSecond, spec.canvas.duration));
      setCurrentTime(time);
    },
    [pixelsPerSecond, setCurrentTime, spec, isPanning]
  );

  if (!spec) return null;

  const totalWidth = spec.canvas.duration * pixelsPerSecond;

  return (
    <div className="border-t bg-card flex flex-col h-full">
      {/* Zoom Controls Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          className="h-7 w-7 p-0"
          title="Zoom out (-)"
        >
          <MinusIcon />
        </Button>

        <Slider
          value={[pixelsPerSecond]}
          onValueChange={([value]) => setPixelsPerSecond(value)}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={5}
          className="w-32"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          className="h-7 w-7 p-0"
          title="Zoom in (+)"
        >
          <PlusIcon />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={fitToWindow}
          className="h-7 px-2 text-xs"
          title="Fit timeline (0)"
        >
          Fit
        </Button>

        <div className="flex-1" />

        <div className="text-xs text-muted-foreground">
          {Math.round(pixelsPerSecond)}px/s • Shift+Drag to pan • Ctrl+Scroll to zoom
        </div>
      </div>

      {/* Timeline scroll container */}
      <div
        className="flex-1 overflow-x-auto overflow-y-auto timeline-scrollbar"
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ width: totalWidth, minWidth: '100%' }}>
          {/* Time ruler - sticky at top */}
          <div
            className="sticky top-0 z-30 bg-card border-b h-8 cursor-pointer select-none"
            onClick={handleTimelineClick}
          >
            <div className="relative h-full">
              <TimeRuler
                duration={spec.canvas.duration}
                pps={pixelsPerSecond}
              />
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: currentTime * pixelsPerSecond }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Tracks */}
          <div>
            {spec.composition.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                pps={pixelsPerSecond}
                currentTime={currentTime}
                selectedClipId={selectedClipId}
                onSelectClip={setSelectedClipId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeRuler({
  duration,
  pps,
}: {
  duration: number;
  pps: number;
}) {
  const markers: React.ReactNode[] = [];

  // Adaptive step based on zoom level
  let step = 1;
  if (pps < 30) step = 10;
  else if (pps < 50) step = 5;
  else if (pps < 80) step = 2;
  else if (pps < 120) step = 1;
  else step = 0.5;

  for (let t = 0; t <= duration; t += step) {
    const isMajor = t % (step * 5) === 0;
    markers.push(
      <div
        key={t}
        className="absolute top-0 text-[10px] text-muted-foreground select-none"
        style={{ left: t * pps }}
      >
        <div
          className={`w-px bg-muted-foreground ${isMajor ? 'h-4 opacity-50' : 'h-2 opacity-30'}`}
        />
        {isMajor && (
          <span className="ml-0.5 font-mono">{formatTime(t)}</span>
        )}
      </div>
    );
  }

  return <div className="relative h-full">{markers}</div>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

function TrackRow({
  track,
  pps,
  currentTime,
  selectedClipId,
  onSelectClip,
}: {
  track: Track;
  pps: number;
  currentTime: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
}) {
  const bgColor = TRACK_COLORS[track.type] || 'bg-gray-600/60';

  return (
    <div className="relative border-b hover:bg-muted/20 transition-colors" style={{ height: TRACK_HEIGHT }}>
      {/* Track label - sticky */}
      <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center px-2 text-xs font-semibold text-foreground/70 bg-card/95 backdrop-blur-sm z-10 border-r">
        {track.type}
      </div>

      {/* Clips */}
      <div className="relative ml-20" style={{ height: TRACK_HEIGHT }}>
        {track.clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            pps={pps}
            trackType={track.type}
            isSelected={selectedClipId === clip.id}
            onClick={() =>
              onSelectClip(selectedClipId === clip.id ? null : clip.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  pps,
  trackType,
  isSelected,
  onClick,
}: {
  clip: Clip;
  pps: number;
  trackType: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colorClass =
    clip.type === 'skill' && clip.skillType
      ? SKILL_COLORS[clip.skillType] || 'bg-purple-500/80'
      : TRACK_COLORS[trackType] || 'bg-gray-500/80';

  const label =
    clip.type === 'skill' && clip.skillType
      ? clip.skillType
      : clip.type;

  const width = Math.max(clip.duration * pps, 30);

  return (
    <div
      className={`absolute top-1.5 bottom-1.5 rounded cursor-pointer flex items-center px-2 text-xs font-medium text-white truncate transition-all border border-white/20 ${colorClass} ${
        isSelected ? 'ring-2 ring-white shadow-lg scale-105 z-10' : 'hover:brightness-110 hover:shadow-md'
      }`}
      style={{
        left: clip.startTime * pps,
        width,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${label} (${clip.duration.toFixed(1)}s)`}
    >
      <span className="truncate">{label}</span>
      {width > 60 && (
        <span className="ml-auto text-[10px] opacity-70">
          {clip.duration.toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
