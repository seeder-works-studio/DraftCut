'use client';

import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import type { Track, Clip } from '@/lib/spec/types';

const TRACK_HEIGHT = 48;
const TRACK_COLORS: Record<string, string> = {
  video: 'bg-blue-600/60',
  overlay: 'bg-purple-600/60',
  audio: 'bg-green-600/60',
};

const SKILL_COLORS: Record<string, string> = {
  IntroTitleCard: 'bg-amber-500/80',
  LowerThird: 'bg-sky-500/80',
  CaptionsPop: 'bg-pink-500/80',
  CalloutBoxArrow: 'bg-red-500/80',
  OutroCTA: 'bg-emerald-500/80',
};

export function Timeline() {
  const spec = useProjectStore((s) => s.spec);
  const { currentTime, setCurrentTime, pixelsPerSecond, selectedClipId, setSelectedClipId } =
    useEditorStore();
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current || !spec) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const time = Math.max(0, Math.min(x / pixelsPerSecond, spec.canvas.duration));
      setCurrentTime(time);
    },
    [pixelsPerSecond, setCurrentTime, spec]
  );

  if (!spec) return null;

  const totalWidth = spec.canvas.duration * pixelsPerSecond;

  return (
    <div className="border-t bg-card flex flex-col h-full">
      {/* Single scroll container for both ruler and tracks */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" ref={timelineRef}>
        <div style={{ width: totalWidth, minWidth: '100%' }}>
          {/* Time ruler - sticky at top */}
          <div
            className="sticky top-0 z-30 bg-card border-b h-6 cursor-pointer"
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
              />
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
  const step = pps >= 80 ? 1 : pps >= 40 ? 2 : 5;

  for (let t = 0; t <= duration; t += step) {
    markers.push(
      <div
        key={t}
        className="absolute top-0 text-[10px] text-muted-foreground"
        style={{ left: t * pps }}
      >
        <div className="h-2 w-px bg-muted-foreground/30" />
        <span className="ml-0.5">{t}s</span>
      </div>
    );
  }

  return <div className="relative h-full">{markers}</div>;
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
    <div className="relative border-b" style={{ height: TRACK_HEIGHT }}>
      {/* Track label */}
      <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center px-2 text-xs font-medium text-muted-foreground bg-card z-10 border-r">
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

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-pointer flex items-center px-2 text-xs font-medium text-white truncate transition-all ${colorClass} ${
        isSelected ? 'ring-2 ring-white' : 'hover:brightness-110'
      }`}
      style={{
        left: clip.startTime * pps,
        width: Math.max(clip.duration * pps, 20),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </div>
  );
}
