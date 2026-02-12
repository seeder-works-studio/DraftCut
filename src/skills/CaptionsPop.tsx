import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';

export interface Caption {
  text: string;
  startTime: number;
  duration: number;
  emphasizedWords?: number[];
}

export interface CaptionsPopProps {
  captions: Caption[];
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
}

export const CaptionsPop: React.FC<CaptionsPopProps> = ({
  captions,
  fontSize,
  fontFamily,
  color,
  backgroundColor,
  position,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const activeCaption = captions.find(
    (cap) => time >= cap.startTime && time < cap.startTime + cap.duration
  );

  if (!activeCaption) return null;

  const words = activeCaption.text.split(' ');
  const wordDuration = activeCaption.duration / words.length;
  const currentWordIndex = Math.floor(
    (time - activeCaption.startTime) / wordDuration
  );

  const yPosition =
    position === 'top' ? '15%' : position === 'center' ? '50%' : '80%';

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: yPosition === '50%' ? 'center' : undefined,
        paddingTop: yPosition === '15%' ? yPosition : undefined,
        paddingBottom: yPosition === '80%' ? '10%' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          padding: '0 40px',
          alignSelf: position === 'bottom' ? 'flex-end' : undefined,
        }}
      >
        {words.map((word, idx) => {
          const isActive = idx === currentWordIndex;
          const isEmphasized =
            activeCaption.emphasizedWords?.includes(idx) ?? false;

          const localFrame = isActive
            ? Math.floor((time - activeCaption.startTime - idx * wordDuration) * fps)
            : 0;
          const popProgress = isActive
            ? spring({ frame: localFrame, fps, config: { damping: 10 } })
            : 1;
          const scale = 1 + (isActive ? 0.2 * popProgress : 0);

          return (
            <span
              key={idx}
              style={{
                fontSize,
                fontFamily,
                fontWeight: isEmphasized || isActive ? 'bold' : 'normal',
                color: isActive ? '#FFD700' : color,
                backgroundColor: backgroundColor || 'transparent',
                padding: '5px 10px',
                borderRadius: 4,
                transform: `scale(${scale})`,
                display: 'inline-block',
                transition: 'color 0.1s',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
