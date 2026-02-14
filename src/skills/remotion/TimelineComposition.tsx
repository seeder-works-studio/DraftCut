/**
 * Timeline Composition - Renders the entire video timeline with all clips
 */

import React from 'react';
import { AbsoluteFill, Video, Img, Audio, Sequence, useCurrentFrame } from 'remotion';
import type { ProjectSpec } from '@/lib/spec/types';
import { SKILL_REGISTRY } from '@/skills/registry';

interface TimelineCompositionProps {
  spec: ProjectSpec;
  assetBlobUrls: Record<string, string>;
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({
  spec,
  assetBlobUrls,
}) => {
  const frame = useCurrentFrame();
  const { canvas } = spec;

  // Group clips by type for proper layering
  const videoClips = spec.composition.tracks.flatMap((track) =>
    track.clips.filter((c) => c.type === 'video')
  );
  const imageClips = spec.composition.tracks.flatMap((track) =>
    track.clips.filter((c) => c.type === 'image')
  );
  const audioClips = spec.composition.tracks.flatMap((track) =>
    track.clips.filter((c) => c.type === 'audio')
  );
  const skillClips = spec.composition.tracks.flatMap((track) =>
    track.clips.filter((c) => c.type === 'skill')
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: canvas.backgroundColor,
      }}
    >
      {/* Layer 1: Video clips (background) */}
      {videoClips.map((clip) => {
        if (!clip.assetId) return null;
        const blobUrl = assetBlobUrls[clip.assetId];
        if (!blobUrl) return null;

        const startFrame = Math.round(clip.startTime * canvas.fps);
        const durationInFrames = Math.round(clip.duration * canvas.fps);

        return (
          <Sequence key={clip.id} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill
              style={{
                transform: `translate(${clip.transform?.x || 0}px, ${clip.transform?.y || 0}px) scale(${clip.transform?.scale || 1})`,
                opacity: clip.transform?.opacity ?? 1,
              }}
            >
              <Video
                src={blobUrl}
                startFrom={Math.round((clip.trimStart || 0) * canvas.fps)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Layer 2: Image clips */}
      {imageClips.map((clip) => {
        if (!clip.assetId) return null;
        const blobUrl = assetBlobUrls[clip.assetId];
        if (!blobUrl) return null;

        const startFrame = Math.round(clip.startTime * canvas.fps);
        const durationInFrames = Math.round(clip.duration * canvas.fps);

        return (
          <Sequence key={clip.id} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill
              style={{
                transform: `translate(${clip.transform?.x || 0}px, ${clip.transform?.y || 0}px) scale(${clip.transform?.scale || 1})`,
                opacity: clip.transform?.opacity ?? 1,
              }}
            >
              <Img
                src={blobUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Layer 3: Skill clips (overlays) */}
      {skillClips.map((clip) => {
        if (!clip.skillType || !clip.skillProps) return null;

        const skillDef = SKILL_REGISTRY[clip.skillType];
        if (!skillDef) return null;

        const startFrame = Math.round(clip.startTime * canvas.fps);
        const durationInFrames = Math.round(clip.duration * canvas.fps);

        // Inject assetBlobUrls into skill props
        const enhancedProps = {
          ...(clip.skillProps || skillDef.defaultProps),
          assetBlobUrls,
        };

        const SkillComponent = skillDef.component;

        return (
          <Sequence key={clip.id} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <SkillComponent {...enhancedProps} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Audio tracks */}
      {audioClips.map((clip) => {
        if (!clip.assetId) return null;
        const blobUrl = assetBlobUrls[clip.assetId];
        if (!blobUrl) return null;

        const startFrame = Math.round(clip.startTime * canvas.fps);
        const durationInFrames = Math.round(clip.duration * canvas.fps);

        return (
          <Sequence key={clip.id} from={startFrame} durationInFrames={durationInFrames}>
            <Audio
              src={blobUrl}
              startFrom={Math.round((clip.trimStart || 0) * canvas.fps)}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
