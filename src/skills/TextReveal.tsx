import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from 'remotion';

export type RevealStyle = 'typewriter' | 'fadeIn' | 'slideUp' | 'wordPop' | 'glitch';

export interface TextRevealProps {
  text: string;
  style: RevealStyle;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  style,
  fontSize = 96,
  fontFamily = 'Inter, sans-serif',
  color = '#ffffff',
  backgroundColor = 'transparent',
  align = 'center',
  verticalAlign = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const renderTypewriter = () => {
    const charsToShow = Math.floor(
      interpolate(frame, [0, durationInFrames * 0.7], [0, text.length], {
        extrapolateRight: 'clamp',
      })
    );

    const visibleText = text.substring(0, charsToShow);
    const showCursor = frame < durationInFrames * 0.8 && frame % 20 < 10;

    return (
      <span>
        {visibleText}
        {showCursor && <span style={{ opacity: 0.8 }}>|</span>}
      </span>
    );
  };

  const renderFadeIn = () => {
    const opacity = interpolate(frame, [0, durationInFrames * 0.3], [0, 1], {
      extrapolateRight: 'clamp',
    });

    return <span style={{ opacity }}>{text}</span>;
  };

  const renderSlideUp = () => {
    const progress = spring({ frame, fps, config: { damping: 15 } });
    const translateY = interpolate(progress, [0, 1], [50, 0]);
    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return (
      <span
        style={{
          display: 'inline-block',
          transform: `translateY(${translateY}px)`,
          opacity,
        }}
      >
        {text}
      </span>
    );
  };

  const renderWordPop = () => {
    const words = text.split(' ');
    const wordDuration = durationInFrames / words.length;

    return (
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: align }}>
        {words.map((word, index) => {
          const wordFrame = frame - index * wordDuration;

          if (wordFrame < 0) {
            return (
              <span key={index} style={{ opacity: 0 }}>
                {word}
              </span>
            );
          }

          const progress = spring({
            frame: wordFrame,
            fps,
            config: { damping: 10 },
          });

          const scale = interpolate(progress, [0, 1], [0, 1]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <span
              key={index}
              style={{
                display: 'inline-block',
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  };

  const renderGlitch = () => {
    const glitchIntensity = interpolate(
      frame,
      [0, 15, 30],
      [10, 0, 0],
      {
        extrapolateRight: 'clamp',
      }
    );

    const offsetX = Math.random() * glitchIntensity - glitchIntensity / 2;
    const offsetY = Math.random() * glitchIntensity - glitchIntensity / 2;
    const opacity = interpolate(frame, [0, 20], [0.5, 1], {
      extrapolateRight: 'clamp',
    });

    return (
      <span
        style={{
          display: 'inline-block',
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          opacity,
          textShadow:
            frame < 20
              ? `${offsetX}px ${offsetY}px 0 rgba(255, 0, 0, 0.5), ${-offsetX}px ${-offsetY}px 0 rgba(0, 255, 255, 0.5)`
              : 'none',
        }}
      >
        {text}
      </span>
    );
  };

  const renderContent = () => {
    switch (style) {
      case 'typewriter':
        return renderTypewriter();
      case 'fadeIn':
        return renderFadeIn();
      case 'slideUp':
        return renderSlideUp();
      case 'wordPop':
        return renderWordPop();
      case 'glitch':
        return renderGlitch();
      default:
        return <span>{text}</span>;
    }
  };

  const justifyContent =
    verticalAlign === 'top'
      ? 'flex-start'
      : verticalAlign === 'bottom'
      ? 'flex-end'
      : 'center';

  const textAlign = align;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          fontSize,
          fontFamily,
          color,
          fontWeight: 'bold',
          textAlign,
          maxWidth: '90%',
          lineHeight: 1.3,
        }}
      >
        {renderContent()}
      </div>
    </AbsoluteFill>
  );
};
