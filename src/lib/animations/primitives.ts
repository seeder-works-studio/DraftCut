/**
 * Reusable animation primitives for Remotion skills
 * Based on best practices from remotion-dev/skills
 */

import { interpolate, spring } from 'remotion';

export interface AnimationConfig {
  frame: number;
  fps: number;
  durationInFrames?: number;
}

export interface SpringConfig {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
}

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

export function fadeIn(config: AnimationConfig): number {
  const { frame, durationInFrames = 15 } = config;
  return interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function scaleIn(config: AnimationConfig & { from?: number }): number {
  const { frame, fps, from = 0 } = config;
  const progress = spring({ frame, fps, config: { damping: 15 } });
  return interpolate(progress, [0, 1], [from, 1]);
}

export function slideInFromLeft(
  config: AnimationConfig & { distance?: number }
): number {
  const { frame, fps, distance = 100 } = config;
  const progress = spring({ frame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [-distance, 0]);
}

export function slideInFromRight(
  config: AnimationConfig & { distance?: number }
): number {
  const { frame, fps, distance = 100 } = config;
  const progress = spring({ frame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [distance, 0]);
}

export function slideInFromTop(
  config: AnimationConfig & { distance?: number }
): number {
  const { frame, fps, distance = 100 } = config;
  const progress = spring({ frame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [-distance, 0]);
}

export function slideInFromBottom(
  config: AnimationConfig & { distance?: number }
): number {
  const { frame, fps, distance = 100 } = config;
  const progress = spring({ frame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [distance, 0]);
}

export function bounceIn(config: AnimationConfig): number {
  const { frame, fps } = config;
  return spring({
    frame,
    fps,
    config: { damping: 10, mass: 0.5 },
  });
}

export function elasticIn(config: AnimationConfig): number {
  const { frame, fps } = config;
  return spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 200 },
  });
}

// ============================================================================
// EXIT ANIMATIONS
// ============================================================================

export function fadeOut(config: AnimationConfig & { startFrame: number }): number {
  const { frame, durationInFrames = 15, startFrame } = config;
  const localFrame = frame - startFrame;
  return interpolate(localFrame, [0, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function scaleOut(
  config: AnimationConfig & { startFrame: number; to?: number }
): number {
  const { frame, fps, startFrame, to = 0 } = config;
  const localFrame = frame - startFrame;
  const progress = spring({ frame: localFrame, fps, config: { damping: 15 } });
  return interpolate(progress, [0, 1], [1, to]);
}

export function slideOutToLeft(
  config: AnimationConfig & { startFrame: number; distance?: number }
): number {
  const { frame, fps, startFrame, distance = 100 } = config;
  const localFrame = frame - startFrame;
  const progress = spring({ frame: localFrame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [0, -distance]);
}

export function slideOutToRight(
  config: AnimationConfig & { startFrame: number; distance?: number }
): number {
  const { frame, fps, startFrame, distance = 100 } = config;
  const localFrame = frame - startFrame;
  const progress = spring({ frame: localFrame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [0, distance]);
}

// ============================================================================
// CONTINUOUS ANIMATIONS
// ============================================================================

export function pulse(config: AnimationConfig & { speed?: number; intensity?: number }): number {
  const { frame, speed = 30, intensity = 0.1 } = config;
  const cycle = Math.sin((frame / speed) * Math.PI * 2);
  return 1 + cycle * intensity;
}

export function rotate(config: AnimationConfig & { speed?: number }): number {
  const { frame, speed = 1 } = config;
  return (frame * speed) % 360;
}

export function float(config: AnimationConfig & { speed?: number; distance?: number }): number {
  const { frame, speed = 60, distance = 10 } = config;
  return Math.sin((frame / speed) * Math.PI * 2) * distance;
}

// ============================================================================
// KEN BURNS EFFECTS (for images)
// ============================================================================

export interface KenBurnsConfig extends AnimationConfig {
  startScale?: number;
  endScale?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export function kenBurns(config: KenBurnsConfig): {
  scale: number;
  x: number;
  y: number;
} {
  const {
    frame,
    durationInFrames = 150,
    startScale = 1,
    endScale = 1.2,
    startX = 0,
    startY = 0,
    endX = 0,
    endY = 0,
  } = config;

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    scale: interpolate(progress, [0, 1], [startScale, endScale]),
    x: interpolate(progress, [0, 1], [startX, endX]),
    y: interpolate(progress, [0, 1], [startY, endY]),
  };
}

export function kenBurnsZoomIn(config: AnimationConfig): {
  scale: number;
  x: number;
  y: number;
} {
  return kenBurns({
    ...config,
    startScale: 1,
    endScale: 1.3,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
}

export function kenBurnsZoomOut(config: AnimationConfig): {
  scale: number;
  x: number;
  y: number;
} {
  return kenBurns({
    ...config,
    startScale: 1.3,
    endScale: 1,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
}

export function kenBurnsPanRight(config: AnimationConfig): {
  scale: number;
  x: number;
  y: number;
} {
  return kenBurns({
    ...config,
    startScale: 1.2,
    endScale: 1.2,
    startX: -50,
    startY: 0,
    endX: 50,
    endY: 0,
  });
}

export function kenBurnsPanLeft(config: AnimationConfig): {
  scale: number;
  x: number;
  y: number;
} {
  return kenBurns({
    ...config,
    startScale: 1.2,
    endScale: 1.2,
    startX: 50,
    startY: 0,
    endX: -50,
    endY: 0,
  });
}

// ============================================================================
// TRANSITION ANIMATIONS
// ============================================================================

export function crossFade(config: AnimationConfig & { overlap?: number }): {
  outOpacity: number;
  inOpacity: number;
} {
  const { frame, durationInFrames = 20, overlap = 10 } = config;

  const fadeOutEnd = durationInFrames - overlap;
  const fadeInStart = overlap;

  const outOpacity = interpolate(frame, [0, fadeOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const inOpacity = interpolate(frame, [fadeInStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return { outOpacity, inOpacity };
}

export function wipeLeft(config: AnimationConfig): number {
  const { frame, durationInFrames = 20 } = config;
  return interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function circularReveal(config: AnimationConfig): number {
  const { frame, fps } = config;
  const progress = spring({ frame, fps, config: { damping: 20 } });
  return interpolate(progress, [0, 1], [0, 150]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function easeInOut(progress: number): number {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

export function easeOut(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function easeIn(progress: number): number {
  return progress * progress * progress;
}

/**
 * Combine entrance and exit animations for a clip
 */
export function clipWithEntranceExit(config: {
  frame: number;
  fps: number;
  durationInFrames: number;
  entranceDuration?: number;
  exitDuration?: number;
}): {
  opacity: number;
  scale: number;
} {
  const {
    frame,
    fps,
    durationInFrames,
    entranceDuration = 10,
    exitDuration = 10,
  } = config;

  const exitStartFrame = durationInFrames - exitDuration;

  let opacity = 1;
  let scale = 1;

  // Entrance
  if (frame < entranceDuration) {
    opacity = fadeIn({ frame, fps, durationInFrames: entranceDuration });
    scale = scaleIn({ frame, fps, from: 0.8 });
  }
  // Exit
  else if (frame >= exitStartFrame) {
    opacity = fadeOut({
      frame,
      fps,
      startFrame: exitStartFrame,
      durationInFrames: exitDuration,
    });
    scale = scaleOut({
      frame,
      fps,
      startFrame: exitStartFrame,
      to: 0.8,
    });
  }

  return { opacity, scale };
}
