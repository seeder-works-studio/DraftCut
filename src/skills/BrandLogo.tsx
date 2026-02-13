import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface BrandLogoProps {
  logoAssetId: string;
  animationType?: 'bounce' | 'pulse' | 'slide' | 'rotate' | 'fade';
  scale?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  loop?: boolean; // Whether to loop the animation
  assetBlobUrls?: Record<string, string>;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoAssetId,
  animationType = 'bounce',
  scale = 1,
  position = 'center',
  loop = false,
  assetBlobUrls = {},
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoUrl = assetBlobUrls[logoAssetId] || logoAssetId;

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

  // Looping animation (if enabled)
  const loopFrame = loop ? frame % (fps * 2) : 0; // 2 second loop
  const loopProgress = loop
    ? spring({
        frame: loopFrame,
        fps,
        from: 0,
        to: 1,
        config: {
          damping: 20,
          stiffness: 200,
        },
      })
    : 1;

  let transform = '';
  let opacity = 1;

  switch (animationType) {
    case 'bounce':
      const bounceY = interpolate(entranceProgress, [0, 0.5, 0.7, 1], [100, -20, 10, 0]);
      const bounceScale = interpolate(entranceProgress, [0, 0.5, 1], [0.5, 1.1, 1]);
      const loopBounce = loop ? interpolate(loopProgress, [0, 0.5, 1], [0, -10, 0]) : 0;
      transform = `translateY(${bounceY + loopBounce}px) scale(${bounceScale * scale})`;
      opacity = interpolate(entranceProgress, [0, 0.3, 1], [0, 1, 1]);
      break;

    case 'pulse':
      const pulseScale = interpolate(entranceProgress, [0, 1], [0, 1]);
      const loopPulse = loop ? interpolate(loopProgress, [0, 0.5, 1], [1, 1.1, 1]) : 1;
      transform = `scale(${pulseScale * loopPulse * scale})`;
      opacity = interpolate(entranceProgress, [0, 0.5, 1], [0, 1, 1]);
      break;

    case 'slide':
      const slideX = interpolate(entranceProgress, [0, 1], [-200, 0]);
      transform = `translateX(${slideX}px) scale(${scale})`;
      opacity = interpolate(entranceProgress, [0, 0.5, 1], [0, 1, 1]);
      break;

    case 'rotate':
      const rotate = interpolate(entranceProgress, [0, 0.7, 1], [180, -10, 0]);
      const rotateScale = interpolate(entranceProgress, [0, 1], [0, 1]);
      const loopRotate = loop
        ? interpolate(loopProgress, [0, 0.5, 1], [0, 5, 0])
        : 0;
      transform = `rotate(${rotate + loopRotate}deg) scale(${rotateScale * scale})`;
      opacity = interpolate(entranceProgress, [0, 0.3, 1], [0, 1, 1]);
      break;

    case 'fade':
      opacity = interpolate(entranceProgress, [0, 1], [0, 1]);
      transform = `scale(${scale})`;
      break;
  }

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    'top-left': {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      padding: 40,
    },
    'top-right': {
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      padding: 40,
    },
    'bottom-left': {
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      padding: 40,
    },
    'bottom-right': {
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      padding: 40,
    },
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        display: 'flex',
        ...positionStyles[position],
      }}
    >
      <Img
        src={logoUrl}
        style={{
          maxWidth: '30%',
          maxHeight: '30%',
          objectFit: 'contain',
          transform,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
