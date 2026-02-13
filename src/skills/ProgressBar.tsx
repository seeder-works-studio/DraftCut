import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  borderRadius?: number;
  position?: 'top' | 'center' | 'bottom';
  assetBlobUrls?: Record<string, string>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  animated = true,
  color = '#00d9ff',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  height = 40,
  borderRadius = 20,
  position = 'center',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate progress bar fill
  const fillProgress = animated
    ? spring({
        frame,
        fps,
        from: 0,
        to: progress,
        config: {
          damping: 20,
          stiffness: 50,
        },
      })
    : progress;

  // Entrance animation
  const entranceProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const opacity = interpolate(entranceProgress, [0, 0.5, 1], [0, 1, 1]);
  const scale = interpolate(entranceProgress, [0, 1], [0.9, 1]);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { justifyContent: 'flex-start', paddingTop: 80 },
    center: { justifyContent: 'center' },
    bottom: { justifyContent: 'flex-end', paddingBottom: 80 },
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...positionStyles[position],
        padding: '0 80px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {/* Label */}
        {label && (
          <div
            style={{
              color: '#ffffff',
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 16,
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {label}
          </div>
        )}

        {/* Progress bar container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height,
            backgroundColor,
            borderRadius,
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Progress bar fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${fillProgress}%`,
              backgroundColor: color,
              borderRadius,
              transition: animated ? 'none' : 'width 0.3s ease',
              background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            }}
          />

          {/* Percentage text */}
          {showPercentage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: Math.min(height * 0.5, 20),
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {Math.round(fillProgress)}%
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
