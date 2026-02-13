'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { SKILL_REGISTRY } from '@/skills/registry';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import type { Clip } from '@/lib/spec/types';

export function Preview() {
  const spec = useProjectStore((s) => s.spec);
  const assetBlobUrls = useProjectStore((s) => s.assetBlobUrls);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  // Measure container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Reserve some padding
        setContainerSize({
          width: width - 80,
          height: height - 80
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Find active clips at current time for each track type
  const { activeVideoClip, activeImageClips, activeSkills, activeAudioClips } =
    useMemo(() => {
      if (!spec) {
        return {
          activeVideoClip: null,
          activeImageClips: [] as Clip[],
          activeSkills: [] as Clip[],
          activeAudioClips: [] as Clip[],
        };
      }

      let activeVideoClip: Clip | null = null;
      const activeImageClips: Clip[] = [];
      const activeSkills: Clip[] = [];
      const activeAudioClips: Clip[] = [];

      for (const track of spec.composition.tracks) {
        for (const clip of track.clips) {
          if (
            currentTime >= clip.startTime &&
            currentTime < clip.startTime + clip.duration
          ) {
            if (clip.type === 'video') activeVideoClip = clip;
            else if (clip.type === 'image') activeImageClips.push(clip);
            else if (clip.type === 'skill') activeSkills.push(clip);
            else if (clip.type === 'audio') activeAudioClips.push(clip);
          }
        }
      }

      return { activeVideoClip, activeImageClips, activeSkills, activeAudioClips };
    }, [spec, currentTime]);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-muted-foreground">
        No project loaded
      </div>
    );
  }

  // Calculate scale to fit container while maintaining aspect ratio
  const scale = Math.min(
    1,
    Math.min(containerSize.width / spec.canvas.width, containerSize.height / spec.canvas.height)
  );

  return (
    <div ref={containerRef} className="flex items-center justify-center h-full bg-black p-4 overflow-hidden">
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
        {/* Base layer: video */}
        {activeVideoClip && activeVideoClip.assetId && (
          <VideoLayer
            clip={activeVideoClip}
            blobUrl={assetBlobUrls[activeVideoClip.assetId]}
            currentTime={currentTime}
            isPlaying={isPlaying}
            scale={scale}
          />
        )}

        {/* Base layer: images */}
        {activeImageClips.map((clip) =>
          clip.assetId ? (
            <ImageLayer
              key={clip.id}
              blobUrl={assetBlobUrls[clip.assetId]}
              scale={scale}
              canvasWidth={spec.canvas.width}
              canvasHeight={spec.canvas.height}
            />
          ) : null
        )}

        {/* Placeholder when no media */}
        {!activeVideoClip && activeImageClips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-sm">
            {spec.canvas.width}x{spec.canvas.height}
          </div>
        )}

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
            assetBlobUrls={assetBlobUrls}
          />
        ))}

        {/* Audio elements (hidden) */}
        {activeAudioClips.map((clip) =>
          clip.assetId ? (
            <AudioLayer
              key={clip.id}
              clip={clip}
              blobUrl={assetBlobUrls[clip.assetId]}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

function VideoLayer({
  clip,
  blobUrl,
  currentTime,
  isPlaying,
  scale,
}: {
  clip: Clip;
  blobUrl?: string;
  currentTime: number;
  isPlaying: boolean;
  scale: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !blobUrl) return;

    // Calculate the time within the video file
    const clipOffset = currentTime - clip.startTime;
    const videoTime = (clip.trimStart || 0) + clipOffset;

    // Sync time if drifted
    if (Math.abs(video.currentTime - videoTime) > 0.3) {
      video.currentTime = videoTime;
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
      video.currentTime = videoTime;
    }
  }, [currentTime, isPlaying, blobUrl, clip.startTime, clip.trimStart]);

  if (!blobUrl) return null;

  return (
    <video
      ref={videoRef}
      src={blobUrl}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ transform: `scale(${1})` }}
      muted={false}
      playsInline
    />
  );
}

function ImageLayer({
  blobUrl,
  scale,
  canvasWidth,
  canvasHeight,
}: {
  blobUrl?: string;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  if (!blobUrl) return null;

  return (
    <img
      src={blobUrl}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

function AudioLayer({
  clip,
  blobUrl,
  currentTime,
  isPlaying,
}: {
  clip: Clip;
  blobUrl?: string;
  currentTime: number;
  isPlaying: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !blobUrl) return;

    const clipOffset = currentTime - clip.startTime;
    const audioTime = (clip.trimStart || 0) + clipOffset;

    if (Math.abs(audio.currentTime - audioTime) > 0.3) {
      audio.currentTime = audioTime;
    }

    if (isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
      audio.currentTime = audioTime;
    }
  }, [currentTime, isPlaying, blobUrl, clip.startTime, clip.trimStart]);

  if (!blobUrl) return null;

  return <audio ref={audioRef} src={blobUrl} />;
}

function SkillOverlay({
  clip,
  currentTime,
  width,
  height,
  scale,
  fps,
  assetBlobUrls,
}: {
  clip: Clip;
  currentTime: number;
  width: number;
  height: number;
  scale: number;
  fps: number;
  assetBlobUrls: Record<string, string>;
}) {
  const skillDef = SKILL_REGISTRY[clip.skillType!];
  const playerRef = useRef<PlayerRef>(null);

  if (!skillDef) return null;

  // Clamp relativeFrame to prevent negative values that cause interpolate errors
  const relativeFrame = Math.max(0, Math.floor((currentTime - clip.startTime) * fps));
  const durationInFrames = Math.ceil(clip.duration * fps);

  // Inject assetBlobUrls into skill props
  const enhancedProps = {
    ...(clip.skillProps || skillDef.defaultProps),
    assetBlobUrls,
  };

  // Sync player to current frame
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.seekTo(relativeFrame);
    }
  }, [relativeFrame]);

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
        ref={playerRef}
        component={skillDef.component}
        inputProps={enhancedProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{
          width: width * scale,
          height: height * scale,
        }}
        renderLoading={() => null}
        controls={false}
        autoPlay={false}
      />
    </div>
  );
}
