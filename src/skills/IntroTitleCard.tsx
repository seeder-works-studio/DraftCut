import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill, interpolate, Img } from 'remotion';

export interface IntroTitleCardProps {
  title: string;
  subtitle?: string;
  logoAssetId?: string;
  assetBlobUrls?: Record<string, string>;
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  accentColor?: string;
}

export const IntroTitleCard: React.FC<IntroTitleCardProps> = ({
  title,
  subtitle,
  logoAssetId,
  assetBlobUrls = {},
  backgroundColor,
  titleColor,
  subtitleColor,
  accentColor = '#8B5CF6',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Enhanced entrance animations
  const titleProgress = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const titleY = interpolate(titleProgress, [0, 1], [80, 0]);
  const titleScale = interpolate(titleProgress, [0, 1], [0.8, 1]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  const subtitleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  const logoProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, mass: 0.5 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoRotate = interpolate(logoProgress, [0, 1], [-180, 0]);

  // Accent bar animation
  const accentBarProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 25 },
  });
  const accentBarWidth = interpolate(accentBarProgress, [0, 1], [0, 100]);

  // Pulse effect for emphasis
  const pulseIntensity = Math.sin((frame / 15) * Math.PI * 2) * 0.05 + 1;

  // Exit animation
  const exitStartFrame = durationInFrames - 15;
  let exitOpacity = 1;
  let exitScale = 1;
  if (frame >= exitStartFrame) {
    const exitProgress = (frame - exitStartFrame) / 15;
    exitOpacity = 1 - exitProgress;
    exitScale = 1 + exitProgress * 0.2;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        opacity: exitOpacity,
      }}
    >
      {/* Logo */}
      {logoAssetId && (
        <div
          style={{
            marginBottom: 30,
            transform: `scale(${logoScale * exitScale}) rotate(${logoRotate}deg)`,
            opacity: logoProgress,
          }}
        >
          <Img
            src={(() => {
              const logoSrc = assetBlobUrls[logoAssetId] || logoAssetId;
              console.log('[IntroTitleCard] Rendering logo:', {
                logoAssetId,
                logoSrc,
                hasBlobUrl: !!assetBlobUrls[logoAssetId],
                allBlobUrls: Object.keys(assetBlobUrls),
              });
              return logoSrc;
            })()}
            style={{
              width: 160,
              height: 160,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontSize: 108,
          fontWeight: 900,
          color: titleColor,
          transform: `translateY(${titleY}px) scale(${titleScale * pulseIntensity * exitScale})`,
          opacity: titleOpacity,
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: '-0.02em',
          textShadow: `0 4px 20px ${accentColor}40`,
        }}
      >
        {title}
      </h1>

      {/* Accent bar */}
      <div
        style={{
          width: `${accentBarWidth}%`,
          maxWidth: 400,
          height: 6,
          backgroundColor: accentColor,
          marginTop: 20,
          marginBottom: 20,
          borderRadius: 3,
          boxShadow: `0 0 20px ${accentColor}80`,
        }}
      />

      {/* Subtitle */}
      {subtitle && (
        <h2
          style={{
            fontSize: 56,
            color: subtitleColor,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px) scale(${exitScale})`,
            textAlign: 'center',
            marginTop: 0,
            fontWeight: '500',
            letterSpacing: '0.01em',
          }}
        >
          {subtitle}
        </h2>
      )}

      {/* Animated corner accents */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: interpolate(accentBarProgress, [0, 1], [0, 80]),
          height: 4,
          backgroundColor: accentColor,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 4,
          height: interpolate(accentBarProgress, [0, 1], [0, 80]),
          backgroundColor: accentColor,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: interpolate(accentBarProgress, [0, 1], [0, 80]),
          height: 4,
          backgroundColor: accentColor,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 4,
          height: interpolate(accentBarProgress, [0, 1], [0, 80]),
          backgroundColor: accentColor,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
