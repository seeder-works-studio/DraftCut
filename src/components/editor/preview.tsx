'use client';

import { useMemo } from 'react';
import { Player } from '@remotion/player';
import { SKILL_REGISTRY } from '@/skills/registry';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import type { Clip } from '@/lib/spec/types';

export function Preview() {
  const spec = useProjectStore((s) => s.spec);
  const currentTime = useEditorStore((s) => s.currentTime);

  const activeSkills = useMemo(() => {
    if (!spec) return [];
    const overlayTrack = spec.composition.tracks.find(
      (t) => t.type === 'overlay'
    );
    if (!overlayTrack) return [];

    return overlayTrack.clips.filter(
      (c) =>
        c.type === 'skill' &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
    );
  }, [spec, currentTime]);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-muted-foreground">
        No project loaded
      </div>
    );
  }

  const scale = Math.min(
    1,
    Math.min(400 / spec.canvas.width, 700 / spec.canvas.height)
  );

  return (
    <div className="flex items-center justify-center h-full bg-black p-4 overflow-hidden">
      <div
        className="relative"
        style={{
          width: spec.canvas.width * scale,
          height: spec.canvas.height * scale,
          backgroundColor: spec.canvas.backgroundColor,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Base layer placeholder */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm">
          {spec.canvas.width}x{spec.canvas.height}
        </div>

        {/* Remotion skill overlays */}
        {activeSkills.map((clip) => (
          <SkillOverlay
            key={clip.id}
            clip={clip}
            currentTime={currentTime}
            width={spec.canvas.width}
            height={spec.canvas.height}
            scale={scale}
            fps={spec.canvas.fps}
          />
        ))}
      </div>
    </div>
  );
}

function SkillOverlay({
  clip,
  currentTime,
  width,
  height,
  scale,
  fps,
}: {
  clip: Clip;
  currentTime: number;
  width: number;
  height: number;
  scale: number;
  fps: number;
}) {
  const skillDef = SKILL_REGISTRY[clip.skillType!];
  if (!skillDef) return null;

  const relativeFrame = Math.floor((currentTime - clip.startTime) * fps);
  const durationInFrames = Math.ceil(clip.duration * fps);

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        width: width * scale,
        height: height * scale,
      }}
    >
      <Player
        component={skillDef.component}
        inputProps={clip.skillProps || skillDef.defaultProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{
          width: width * scale,
          height: height * scale,
        }}
        renderLoading={() => null}
        initialFrame={relativeFrame}
        controls={false}
        autoPlay={false}
      />
    </div>
  );
}
