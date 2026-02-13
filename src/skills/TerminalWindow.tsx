import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface TerminalWindowProps {
  command: string;
  output?: string;
  theme?: 'light' | 'dark';
  rotationY?: number; // 3D rotation in degrees
  slideDirection?: 'up' | 'down' | 'left' | 'right';
  fontSize?: number;
  fontFamily?: string;
  assetBlobUrls?: Record<string, string>;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  command,
  output = '',
  theme = 'light',
  rotationY = 20,
  slideDirection = 'up',
  fontSize = 32,
  fontFamily = 'Monaco, Courier, monospace',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation: slide up from bottom
  const slideProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  // Calculate slide offset based on direction
  const slideY = interpolate(slideProgress, [0, 1], [100, 0]);

  // Rocking animation: oscillate rotation
  const rockProgress = Math.sin((frame / fps) * Math.PI * 0.5); // 2 second period
  const currentRotationY = rotationY + rockProgress * 5; // ±5 degrees oscillation

  // Terminal theme colors
  const bgColor = theme === 'light' ? '#ffffff' : '#1e1e1e';
  const textColor = theme === 'light' ? '#000000' : '#00ff00';
  const promptColor = theme === 'light' ? '#666666' : '#00aa00';
  const borderColor = theme === 'light' ? '#cccccc' : '#333333';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        perspective: 1000,
      }}
    >
      <div
        style={{
          width: '80%',
          maxWidth: 900,
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          transform: `translateY(${slideY}%) rotateY(${currentRotationY}deg)`,
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
        }}
      >
        {/* Terminal title bar */}
        <div
          style={{
            height: 30,
            backgroundColor: theme === 'light' ? '#ececec' : '#2d2d2d',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12,
            gap: 8,
          }}
        >
          {/* macOS traffic lights */}
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#ff5f56',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#ffbd2e',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#27c93f',
            }}
          />
        </div>

        {/* Terminal content */}
        <div
          style={{
            padding: 24,
            fontFamily,
            fontSize,
            color: textColor,
            lineHeight: 1.6,
          }}
        >
          {/* Prompt and command */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: promptColor }}>&gt;</span>
            <span>{command}</span>
          </div>

          {/* Output (if any) */}
          {output && (
            <div style={{ marginTop: 16, opacity: 0.9 }}>
              {output}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
