import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface KineticTypographyProps {
  lines: string[]; // Array of text lines to animate
  animationStyle?: 'bounce' | 'scale' | 'rotate' | 'slide' | 'fade';
  timing?: 'word' | 'line'; // Animate by word or by line
  stagger?: number; // Delay between animations (in frames)
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  emphasizeColor?: string; // Color for emphasized words
  assetBlobUrls?: Record<string, string>;
}

export const KineticTypography: React.FC<KineticTypographyProps> = ({
  lines,
  animationStyle = 'bounce',
  timing = 'line',
  stagger = 15,
  fontSize = 96,
  fontFamily = 'Inter, sans-serif',
  color = '#ffffff',
  backgroundColor = 'transparent',
  align = 'center',
  verticalAlign = 'center',
  emphasizeColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const renderWord = (word: string, index: number, totalWords: number) => {
    const startFrame = index * stagger;
    const progress = spring({
      frame: Math.max(0, frame - startFrame),
      fps,
      from: 0,
      to: 1,
      config: {
        damping: 12,
        stiffness: 200,
      },
    });

    let transform = '';
    let opacity = 1;

    switch (animationStyle) {
      case 'bounce':
        const bounceY = interpolate(progress, [0, 0.5, 1], [50, -10, 0]);
        transform = `translateY(${bounceY}px)`;
        opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 1]);
        break;

      case 'scale':
        const scale = interpolate(progress, [0, 0.5, 1], [0, 1.2, 1]);
        transform = `scale(${scale})`;
        opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);
        break;

      case 'rotate':
        const rotate = interpolate(progress, [0, 0.7, 1], [90, -10, 0]);
        const rotateScale = interpolate(progress, [0, 1], [0.5, 1]);
        transform = `rotate(${rotate}deg) scale(${rotateScale})`;
        opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);
        break;

      case 'slide':
        const slideX = interpolate(progress, [0, 1], [-50, 0]);
        transform = `translateX(${slideX}px)`;
        opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 1]);
        break;

      case 'fade':
        opacity = interpolate(progress, [0, 1], [0, 1]);
        const fadeScale = interpolate(progress, [0, 1], [0.9, 1]);
        transform = `scale(${fadeScale})`;
        break;
    }

    // Check if word should be emphasized (e.g., "ChatCut" in middle line)
    const isEmphasized = emphasizeColor && word.toLowerCase().includes('chatcut');

    return (
      <span
        key={index}
        style={{
          display: 'inline-block',
          marginRight: timing === 'word' ? '0.3em' : 0,
          transform,
          opacity: frame < startFrame ? 0 : opacity,
          color: isEmphasized ? emphasizeColor : color,
          fontWeight: isEmphasized ? 700 : 400,
        }}
      >
        {word}
      </span>
    );
  };

  const renderLine = (line: string, lineIndex: number) => {
    if (timing === 'word') {
      const words = line.split(' ');
      return (
        <div
          key={lineIndex}
          style={{
            marginBottom: '0.5em',
            textAlign: align,
          }}
        >
          {words.map((word, wordIndex) =>
            renderWord(
              word + ' ',
              lineIndex * 20 + wordIndex, // Offset by line
              words.length
            )
          )}
        </div>
      );
    } else {
      // Animate entire line
      const startFrame = lineIndex * stagger;
      const progress = spring({
        frame: Math.max(0, frame - startFrame),
        fps,
        from: 0,
        to: 1,
        config: {
          damping: 15,
          stiffness: 150,
        },
      });

      let transform = '';
      let opacity = 1;

      switch (animationStyle) {
        case 'bounce':
          const bounceY = interpolate(progress, [0, 0.5, 1], [50, -10, 0]);
          transform = `translateY(${bounceY}px)`;
          opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 1]);
          break;

        case 'slide':
          const slideX = interpolate(progress, [0, 1], [-100, 0]);
          transform = `translateX(${slideX}px)`;
          opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 1]);
          break;

        case 'fade':
          opacity = interpolate(progress, [0, 1], [0, 1]);
          break;

        default:
          const scale = interpolate(progress, [0, 1], [0.8, 1]);
          transform = `scale(${scale})`;
          opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 1]);
      }

      // Check if this is the middle line with "ChatCut" for emphasis
      const hasEmphasis = emphasizeColor && line.toLowerCase().includes('chatcut');

      return (
        <div
          key={lineIndex}
          style={{
            marginBottom: '0.3em',
            textAlign: align,
            transform,
            opacity: frame < startFrame ? 0 : opacity,
            color: hasEmphasis ? emphasizeColor : color,
            fontWeight: hasEmphasis ? 700 : 400,
          }}
        >
          {line}
        </div>
      );
    }
  };

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
        fontFamily,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.3,
      }}
    >
      <div style={{ width: '100%' }}>
        {lines.map((line, index) => renderLine(line, index))}
      </div>
    </AbsoluteFill>
  );
};
