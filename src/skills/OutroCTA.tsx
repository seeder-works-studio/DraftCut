import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill, interpolate, Img } from 'remotion';
import { ensureTextContrast } from '@/lib/utils/color-extraction';

export interface OutroCTAProps {
  heading: string;
  ctaText: string;
  url?: string;
  logoAssetId?: string;
  assetBlobUrls?: Record<string, string>;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

export const OutroCTA: React.FC<OutroCTAProps> = ({
  heading,
  ctaText,
  url,
  logoAssetId,
  assetBlobUrls = {},
  backgroundColor,
  textColor,
  buttonColor,
  buttonTextColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ensure text colors have sufficient contrast
  const adjustedTextColor = ensureTextContrast(backgroundColor, textColor);
  const adjustedButtonTextColor = ensureTextContrast(buttonColor, buttonTextColor);

  // Enhanced animations
  const headingProgress = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const headingY = interpolate(headingProgress, [0, 1], [60, 0]);
  const headingOpacity = interpolate(headingProgress, [0, 1], [0, 1]);

  const buttonProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 12, mass: 0.8 },
  });
  const buttonScale = interpolate(buttonProgress, [0, 1], [0.5, 1]);
  const buttonY = interpolate(buttonProgress, [0, 1], [30, 0]);

  const logoProgress = spring({
    frame: frame - 6,
    fps,
    config: { damping: 15 },
  });
  const logoScale = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoY = interpolate(logoProgress, [0, 1], [-20, 0]);

  // Continuous pulse on CTA button
  const pulseCycle = Math.sin((frame / 30) * Math.PI * 2);
  const pulseScale = 1 + pulseCycle * 0.05;
  const pulseGlow = 10 + pulseCycle * 5;

  // Shimmer effect across the button
  const shimmerProgress = ((frame % 60) / 60) * 200 - 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
      }}
    >
      {/* Logo */}
      {logoAssetId && (
        <div
          style={{
            marginBottom: 40,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
            opacity: logoProgress,
          }}
        >
          <Img
            src={assetBlobUrls[logoAssetId] || logoAssetId}
            style={{
              width: 140,
              height: 140,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Heading */}
      <h2
        style={{
          fontSize: 84,
          fontWeight: 'bold',
          color: adjustedTextColor,
          transform: `translateY(${headingY}px)`,
          opacity: headingOpacity,
          textAlign: 'center',
          margin: 0,
          marginBottom: 40,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}
      >
        {heading}
      </h2>

      {/* Animated CTA Button */}
      <div
        style={{
          transform: `translateY(${buttonY}px) scale(${buttonScale * pulseScale})`,
          opacity: buttonProgress,
          position: 'relative',
        }}
      >
        {/* Button glow effect */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            backgroundColor: buttonColor,
            borderRadius: 12,
            opacity: 0.4,
            filter: `blur(${pulseGlow}px)`,
            zIndex: 0,
          }}
        />

        {/* Main button */}
        <div
          style={{
            position: 'relative',
            backgroundColor: buttonColor,
            color: adjustedButtonTextColor,
            padding: '24px 72px',
            fontSize: 42,
            fontWeight: 'bold',
            borderRadius: 8,
            boxShadow: `0 8px 32px ${buttonColor}60`,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {/* Shimmer overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: shimmerProgress + '%',
              width: 50,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />

          <span style={{ position: 'relative', zIndex: 2 }}>{ctaText}</span>
        </div>
      </div>

      {/* URL text */}
      {url && (
        <p
          style={{
            fontSize: 24,
            color: adjustedTextColor,
            marginTop: 30,
            opacity: interpolate(buttonProgress, [0, 1], [0, 0.7]),
          }}
        >
          {url}
        </p>
      )}

      {/* Decorative elements */}
      <div
        style={{
          marginTop: 40,
          opacity: interpolate(buttonProgress, [0, 1], [0, 0.3]),
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          {[0, 1, 2].map((i) => {
            const delay = i * 8;
            const dotProgress = spring({
              frame: frame - 20 - delay,
              fps,
              config: { damping: 20 },
            });
            return (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: buttonColor,
                  opacity: interpolate(dotProgress, [0, 1], [0, 0.6]),
                  transform: `scale(${interpolate(dotProgress, [0, 1], [0, 1])})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
