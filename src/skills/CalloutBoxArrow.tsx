import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';
import { ensureTextContrast } from '@/lib/utils/color-extraction';

export interface CalloutBoxArrowProps {
  text?: string;
  targetX: number;
  targetY: number;
  boxWidth: number;
  boxHeight: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export const CalloutBoxArrow: React.FC<CalloutBoxArrowProps> = ({
  text,
  targetX,
  targetY,
  boxWidth,
  boxHeight,
  arrowPosition,
  strokeColor,
  fillColor,
  strokeWidth,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ensure text color has sufficient contrast against fill background
  const adjustedTextColor = ensureTextContrast(fillColor, strokeColor);

  const fadeIn = spring({ frame, fps, config: { damping: 15 } });

  const arrowLength = 50;
  let boxX = targetX;
  let boxY = targetY;

  switch (arrowPosition) {
    case 'bottom':
      boxX = targetX - boxWidth / 2;
      boxY = targetY - boxHeight - arrowLength;
      break;
    case 'top':
      boxX = targetX - boxWidth / 2;
      boxY = targetY + arrowLength;
      break;
    case 'left':
      boxX = targetX + arrowLength;
      boxY = targetY - boxHeight / 2;
      break;
    case 'right':
      boxX = targetX - boxWidth - arrowLength;
      boxY = targetY - boxHeight / 2;
      break;
  }

  const arrowEndX =
    arrowPosition === 'bottom' || arrowPosition === 'top'
      ? boxX + boxWidth / 2
      : arrowPosition === 'left'
        ? boxX
        : boxX + boxWidth;

  const arrowEndY =
    arrowPosition === 'bottom'
      ? boxY + boxHeight
      : arrowPosition === 'top'
        ? boxY
        : boxY + boxHeight / 2;

  return (
    <AbsoluteFill>
      <svg
        width="100%"
        height="100%"
        style={{ opacity: fadeIn, position: 'absolute', top: 0, left: 0 }}
      >
        <line
          x1={targetX}
          y1={targetY}
          x2={arrowEndX}
          y2={arrowEndY}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          markerEnd="url(#arrowhead)"
        />

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
          </marker>
        </defs>

        <rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          rx={8}
          ry={8}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {text && (
          <text
            x={boxX + boxWidth / 2}
            y={boxY + boxHeight / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={adjustedTextColor}
            fontSize={20}
            fontFamily="sans-serif"
          >
            {text}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
