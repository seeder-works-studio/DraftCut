import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface CountUpNumberProps {
  from: number;
  to: number;
  duration?: number; // Duration in seconds
  suffix?: string; // e.g., "%", "K", "M", "+"
  prefix?: string; // e.g., "$"
  decimals?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  assetBlobUrls?: Record<string, string>;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  from,
  to,
  duration = 2,
  suffix = '',
  prefix = '',
  decimals = 0,
  fontSize = 120,
  fontFamily = 'Inter, sans-serif',
  color = '#ffffff',
  backgroundColor = 'transparent',
  align = 'center',
  verticalAlign = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = duration * fps;

  // Smooth count-up animation
  const progress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: durationFrames,
    config: {
      damping: 20,
      stiffness: 50,
    },
  });

  const currentValue = interpolate(progress, [0, 1], [from, to]);
  const displayValue = currentValue.toFixed(decimals);

  // Scale animation
  const scale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  // Opacity animation
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        justifyContent:
          verticalAlign === 'top'
            ? 'flex-start'
            : verticalAlign === 'bottom'
            ? 'flex-end'
            : 'center',
        alignItems:
          align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight: 700,
          color,
          transform: `scale(${scale})`,
          opacity,
          textAlign: align,
        }}
      >
        {prefix}
        {displayValue}
        {suffix}
      </div>
    </AbsoluteFill>
  );
};
