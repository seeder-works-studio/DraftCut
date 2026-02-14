import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';
import { ensureTextContrast } from '@/lib/utils/color-extraction';

export interface LowerThirdProps {
  name: string;
  title: string;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  backgroundColor: string;
  textColor: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  position,
  backgroundColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ensure text color has sufficient contrast
  const adjustedTextColor = ensureTextContrast(backgroundColor, textColor);

  const slideIn = spring({ frame, fps, config: { damping: 18 } });
  const slideOut = spring({
    frame: frame - (durationInFrames - 15),
    fps,
    config: { damping: 18 },
  });
  const translateX = -300 * (1 - slideIn) + (frame > durationInFrames - 15 ? 300 * slideOut : 0);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 40,
  };

  if (position === 'bottom-left') positionStyle.left = 40;
  else if (position === 'bottom-right') positionStyle.right = 40;
  else {
    positionStyle.left = '50%';
    positionStyle.transform = `translateX(-50%) translateX(${translateX}px)`;
  }

  if (position !== 'bottom-center') {
    positionStyle.transform = `translateX(${translateX}px)`;
  }

  return (
    <AbsoluteFill>
      <div
        style={{
          ...positionStyle,
          backgroundColor,
          padding: '20px 30px',
          borderRadius: 8,
        }}
      >
        <div style={{ color: adjustedTextColor, fontSize: 32, fontWeight: 'bold' }}>
          {name}
        </div>
        <div style={{ color: adjustedTextColor, fontSize: 24, opacity: 0.8 }}>
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};
