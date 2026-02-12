import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';

export interface OutroCTAProps {
  heading: string;
  ctaText: string;
  url?: string;
  logoAssetId?: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

export const OutroCTA: React.FC<OutroCTAProps> = ({
  heading,
  ctaText,
  url,
  backgroundColor,
  textColor,
  buttonColor,
  buttonTextColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 15 } });
  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.05 + 1;

  const buttonDelay = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeIn,
        padding: 40,
      }}
    >
      <h2
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: textColor,
          marginBottom: 40,
          textAlign: 'center',
        }}
      >
        {heading}
      </h2>

      <div
        style={{
          backgroundColor: buttonColor,
          color: buttonTextColor,
          fontSize: 28,
          fontWeight: 'bold',
          padding: '20px 60px',
          borderRadius: 35,
          transform: `scale(${pulse * buttonDelay})`,
          textAlign: 'center',
        }}
      >
        {ctaText}
      </div>

      {url && (
        <p
          style={{
            fontSize: 20,
            color: textColor,
            marginTop: 30,
            opacity: 0.7,
          }}
        >
          {url}
        </p>
      )}
    </AbsoluteFill>
  );
};
