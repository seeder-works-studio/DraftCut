import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';

export interface IntroTitleCardProps {
  title: string;
  subtitle?: string;
  logoAssetId?: string;
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
}

export const IntroTitleCard: React.FC<IntroTitleCardProps> = ({
  title,
  subtitle,
  backgroundColor,
  titleColor,
  subtitleColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({ frame, fps, config: { damping: 20 } });
  const titleY = 100 * (1 - slideUp);
  const subtitleDelay = spring({
    frame: frame - 8,
    fps,
    config: { damping: 20 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      }}
    >
      <h1
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: titleColor,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <h2
          style={{
            fontSize: 36,
            color: subtitleColor,
            opacity: subtitleDelay,
            textAlign: 'center',
            marginTop: 20,
            fontWeight: 'normal',
          }}
        >
          {subtitle}
        </h2>
      )}
    </AbsoluteFill>
  );
};
