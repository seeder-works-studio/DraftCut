/**
 * Remotion utility functions
 */

/**
 * Clamps a frame number to ensure it's always >= 0
 * Prevents "inputRange must be strictly monotonically increasing" errors
 */
export function clampFrame(frame: number): number {
  return Math.max(0, frame);
}

/**
 * Calculate relative frame for a clip, ensuring it's never negative
 *
 * @param currentTime - Current time in seconds
 * @param clipStartTime - When the clip starts on the timeline (seconds)
 * @param fps - Frames per second
 * @returns Frame number >= 0
 */
export function getRelativeFrame(currentTime: number, clipStartTime: number, fps: number): number {
  const relativeTime = currentTime - clipStartTime;
  return clampFrame(Math.floor(relativeTime * fps));
}
