/**
 * MediaRecorder-based video export to WebM
 * Renders timeline frame-by-frame with audio support
 * YouTube-compatible output
 */

import type { ProjectSpec, Clip } from '@/lib/spec/types';
import { SKILL_REGISTRY } from '@/skills/registry';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Player } from '@remotion/player';
import html2canvas from 'html2canvas';

/**
 * Convert any color format to hex (for Remotion compatibility)
 */
function normalizeColorToHex(color: string): string {
  // Already hex
  if (color.startsWith('#')) {
    return color;
  }

  // Named colors
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === 'rgba(0,0,0,0)') {
    return '#000000';
  }

  // LAB colors are not supported by Canvas API - convert to fallback
  if (color.startsWith('lab(') || color.startsWith('lch(') || color.startsWith('oklab(') || color.startsWith('oklch(')) {
    console.warn(`LAB color detected and converted to fallback: ${color}`);
    return '#8B5CF6'; // Purple fallback (brand color)
  }

  // RGB, RGBA, HSL, etc - convert using canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;

    // Check if canvas accepted the color
    if (ctx.fillStyle === '#000000' && color !== 'black' && !color.includes('0')) {
      // Canvas rejected the color, use fallback
      console.warn(`Color rejected by canvas, using fallback: ${color}`);
      return '#8B5CF6';
    }

    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const [r, g, b] = imageData.data;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (err) {
    console.warn(`Failed to convert color "${color}":`, err);
    return '#8B5CF6'; // Fallback to brand purple
  }
}

/**
 * Sanitize all colors in the spec to hex format
 */
function sanitizeSpecColors(spec: ProjectSpec): ProjectSpec {
  const sanitized = JSON.parse(JSON.stringify(spec)) as ProjectSpec;

  // Sanitize canvas background
  if (sanitized.canvas.backgroundColor) {
    sanitized.canvas.backgroundColor = normalizeColorToHex(sanitized.canvas.backgroundColor);
  }

  // Sanitize brand kit colors
  if (sanitized.brandKit) {
    if (sanitized.brandKit.primaryColor) {
      sanitized.brandKit.primaryColor = normalizeColorToHex(sanitized.brandKit.primaryColor);
    }
    if (sanitized.brandKit.secondaryColor) {
      sanitized.brandKit.secondaryColor = normalizeColorToHex(sanitized.brandKit.secondaryColor);
    }
  }

  // Sanitize skill props colors
  for (const track of sanitized.composition.tracks) {
    for (const clip of track.clips) {
      if (clip.skillProps && typeof clip.skillProps === 'object') {
        const props = clip.skillProps as Record<string, unknown>;
        for (const [key, value] of Object.entries(props)) {
          if (typeof value === 'string' && (
            key.toLowerCase().includes('color') ||
            key.toLowerCase().includes('background')
          )) {
            props[key] = normalizeColorToHex(value);
          }
        }
      }
    }
  }

  return sanitized;
}

export interface MediaRecorderExportOptions {
  quality?: 'low' | 'medium' | 'high';
  videoBitrate?: number;
  audioBitrate?: number;
  onProgress?: (progress: number) => void;
}

export interface ExportContext {
  spec: ProjectSpec;
  assetBlobUrls: Record<string, string>;
}

/**
 * Export video using MediaRecorder API
 * Returns WebM blob ready for YouTube upload
 */
export async function exportWithMediaRecorder(
  context: ExportContext,
  options: MediaRecorderExportOptions = {}
): Promise<Blob> {
  // Sanitize all colors to hex format before export
  const spec = sanitizeSpecColors(context.spec);
  const { assetBlobUrls } = context;

  const {
    quality = 'high',
    onProgress,
  } = options;

  const { videoBitrate, audioBitrate } = getQualitySettings(quality);

  // Create offscreen canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = spec.canvas.width;
  canvas.height = spec.canvas.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set up video stream
  const stream = canvas.captureStream(spec.canvas.fps);

  // Add audio track if available
  const audioTrack = await createAudioTrack(spec, assetBlobUrls);
  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  // Set up MediaRecorder
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Start recording
  recorder.start();

  // Calculate total frames
  const totalFrames = Math.ceil(spec.canvas.duration * spec.canvas.fps);

  // Pre-load all video and image elements
  const mediaElements = await preloadMediaElements(spec, assetBlobUrls);

  // Render each frame
  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / spec.canvas.fps;

    // Clear canvas
    ctx.fillStyle = spec.canvas.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render current frame
    await renderFrameToCanvas(ctx, spec, time, frame, mediaElements, assetBlobUrls);

    // Report progress
    if (onProgress && frame % 10 === 0) {
      onProgress(frame / totalFrames);
    }

    // Wait for next frame
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  // Stop recording
  recorder.stop();

  // Wait for final data
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  // Final progress
  if (onProgress) onProgress(1);

  // Return WebM blob
  return new Blob(chunks, { type: mimeType });
}

/**
 * Get quality-based bitrate settings
 */
function getQualitySettings(quality: 'low' | 'medium' | 'high'): {
  videoBitrate: number;
  audioBitrate: number;
} {
  switch (quality) {
    case 'low':
      return { videoBitrate: 2_000_000, audioBitrate: 96_000 };
    case 'medium':
      return { videoBitrate: 5_000_000, audioBitrate: 128_000 };
    case 'high':
      return { videoBitrate: 10_000_000, audioBitrate: 192_000 };
  }
}

/**
 * Get supported WebM mime type
 */
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Pre-load all video and image elements
 */
async function preloadMediaElements(
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<Map<string, HTMLVideoElement | HTMLImageElement>> {
  const elements = new Map<string, HTMLVideoElement | HTMLImageElement>();

  for (const track of spec.composition.tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'video' && clip.assetId) {
        const video = document.createElement('video');
        video.src = assetBlobUrls[clip.assetId];
        video.muted = true;
        video.preload = 'auto';
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            // Ensure enough data is loaded for frame-accurate seeking
            video.oncanplaythrough = resolve;
          };
          video.onerror = reject;
        });
        elements.set(clip.assetId, video);
      } else if (clip.type === 'image' && clip.assetId) {
        const img = new Image();
        img.src = assetBlobUrls[clip.assetId];
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        elements.set(clip.assetId, img);
      } else if (clip.type === 'skill' && clip.skillType === 'ImageSlideshow') {
        // Pre-load images in ImageSlideshow
        const slides = (clip.skillProps as any)?.slides || [];
        for (const slide of slides) {
          if (slide.assetId && !elements.has(slide.assetId)) {
            const img = new Image();
            img.src = assetBlobUrls[slide.assetId];
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            elements.set(slide.assetId, img);
          }
        }
      }
    }
  }

  return elements;
}

/**
 * Create audio track from audio clips
 */
async function createAudioTrack(
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<MediaStreamTrack | null> {
  const audioClips = spec.composition.tracks
    .flatMap(t => t.clips)
    .filter(c => c.type === 'audio');

  if (audioClips.length === 0) return null;

  // For now, return null - audio mixing requires Web Audio API
  // TODO: Implement audio mixing with Web Audio API
  return null;
}

/**
 * Render a single frame to canvas
 */
async function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  spec: ProjectSpec,
  time: number,
  frame: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  const { width, height } = spec.canvas;

  // Find active clips at this time
  const activeClips = spec.composition.tracks
    .flatMap(track => track.clips)
    .filter(clip => time >= clip.startTime && time < clip.startTime + clip.duration)
    .sort((a, b) => {
      // Sort by track type: video < image < skill (overlay)
      const order = { video: 0, audio: 1, image: 2, skill: 3 };
      return (order[a.type] || 0) - (order[b.type] || 0);
    });

  for (const clip of activeClips) {
    const clipTime = time - clip.startTime;

    if (clip.type === 'video' && clip.assetId) {
      await renderVideoClip(ctx, clip, clipTime, mediaElements, width, height);
    } else if (clip.type === 'image' && clip.assetId) {
      await renderImageClip(ctx, clip, clipTime, mediaElements, width, height);
    } else if (clip.type === 'skill') {
      await renderSkillClip(ctx, clip, clipTime, frame, spec, mediaElements, assetBlobUrls);
    }
  }
}

/**
 * Render video clip to canvas
 */
async function renderVideoClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  clipTime: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const video = mediaElements.get(clip.assetId!) as HTMLVideoElement;
  if (!video) return;

  // Seek to correct time (async operation)
  const videoTime = (clip.trimStart || 0) + clipTime;
  if (Math.abs(video.currentTime - videoTime) > 0.1) {
    // Only seek if we're off by more than 0.1s
    video.currentTime = videoTime;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      // Fallback timeout in case seeked event doesn't fire
      setTimeout(resolve, 100);
    });
  }

  // Apply transform
  const transform = clip.transform || {};
  const x = transform.x || 0;
  const y = transform.y || 0;
  const scale = transform.scale || 1;
  const opacity = transform.opacity !== undefined ? transform.opacity : 1;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(canvasWidth / 2 + x, canvasHeight / 2 + y);
  ctx.scale(scale, scale);

  // Draw video centered
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  ctx.drawImage(
    video,
    -videoWidth / 2,
    -videoHeight / 2,
    videoWidth,
    videoHeight
  );

  ctx.restore();
}

/**
 * Render image clip to canvas
 */
async function renderImageClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  clipTime: number,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const img = mediaElements.get(clip.assetId!) as HTMLImageElement;
  if (!img) return;

  // Apply transform
  const transform = clip.transform || {};
  const x = transform.x || 0;
  const y = transform.y || 0;
  const scale = transform.scale || 1;
  const opacity = transform.opacity !== undefined ? transform.opacity : 1;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(canvasWidth / 2 + x, canvasHeight / 2 + y);
  ctx.scale(scale, scale);

  // Calculate size to fit canvas while maintaining aspect ratio
  const imgAspect = img.width / img.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;

  if (imgAspect > canvasAspect) {
    drawHeight = canvasWidth / imgAspect;
  } else {
    drawWidth = canvasHeight * imgAspect;
  }

  ctx.drawImage(
    img,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}

/**
 * Render skill clip to canvas
 */
async function renderSkillClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  clipTime: number,
  currentFrame: number,
  spec: ProjectSpec,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!clip.skillType || !clip.skillProps) return;

  const skillDef = SKILL_REGISTRY[clip.skillType];
  if (!skillDef) return;

  // Special handling for ImageSlideshow (most common)
  if (clip.skillType === 'ImageSlideshow') {
    await renderImageSlideshowToCanvas(
      ctx,
      clip,
      clipTime,
      spec,
      mediaElements,
      assetBlobUrls
    );
    return;
  }

  // For other skills, render using Remotion Player + html2canvas
  await renderRemotionSkillToCanvas(ctx, clip, currentFrame, spec, assetBlobUrls);
}

/**
 * Render any Remotion skill to canvas using Player + html2canvas
 */
async function renderRemotionSkillToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  frame: number,
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!clip.skillType) return;

  const skillDef = SKILL_REGISTRY[clip.skillType];
  if (!skillDef) return;

  // Create hidden container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${spec.canvas.width}px`;
  container.style.height = `${spec.canvas.height}px`;
  container.style.overflow = 'hidden';
  container.style.backgroundColor = spec.canvas.backgroundColor || '#000000';
  document.body.appendChild(container);

  try {
    // Calculate frame relative to clip start
    const durationInFrames = Math.ceil(clip.duration * spec.canvas.fps);

    // CRITICAL: Clamp frame to valid range [0, durationInFrames)
    // Negative frames cause "inputRange must be strictly monotonically increasing" errors
    const clampedFrame = Math.max(0, Math.min(frame, durationInFrames - 1));

    // Inject assetBlobUrls into skill props
    const enhancedProps = {
      ...(clip.skillProps || skillDef.defaultProps),
      assetBlobUrls,
    };

    // Render Remotion Player
    const root = ReactDOM.createRoot(container);
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(Player, {
          component: skillDef.component,
          inputProps: enhancedProps,
          durationInFrames,
          fps: spec.canvas.fps,
          compositionWidth: spec.canvas.width,
          compositionHeight: spec.canvas.height,
          initialFrame: clampedFrame,
          controls: false,
          autoPlay: false,
          style: {
            width: spec.canvas.width,
            height: spec.canvas.height,
          },
        })
      );
      // Wait for render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // Capture rendered content to canvas using html2canvas
    const capturedCanvas = await html2canvas(container, {
      width: spec.canvas.width,
      height: spec.canvas.height,
      backgroundColor: null,
      logging: false,
      scale: 1,
    });

    // Draw captured canvas onto export canvas
    ctx.drawImage(capturedCanvas, 0, 0);

    // Cleanup
    root.unmount();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Render ImageSlideshow skill to canvas with Ken Burns effects
 */
async function renderImageSlideshowToCanvas(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  clipTime: number,
  spec: ProjectSpec,
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  const props = clip.skillProps as any;
  const slides = props.slides || [];
  const transitionDuration = (props.transitionDuration || 20) / spec.canvas.fps;

  // Find current slide
  let currentTime = 0;
  let currentSlide: any = null;
  let slideIndex = 0;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (clipTime >= currentTime && clipTime < currentTime + slide.duration) {
      currentSlide = slide;
      slideIndex = i;
      break;
    }
    currentTime += slide.duration;
  }

  if (!currentSlide) return;

  const img = mediaElements.get(currentSlide.assetId) as HTMLImageElement;
  if (!img) return;

  const slideTime = clipTime - currentTime;
  const { width, height } = spec.canvas;

  // Calculate Ken Burns transform
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  const progress = slideTime / currentSlide.duration;

  switch (currentSlide.kenBurns) {
    case 'zoomIn':
      scale = 1 + progress * 0.3; // Zoom from 1.0 to 1.3
      break;
    case 'zoomOut':
      scale = 1.3 - progress * 0.3; // Zoom from 1.3 to 1.0
      break;
    case 'panRight':
      scale = 1.2;
      offsetX = -50 + progress * 100; // Pan from -50 to 50
      break;
    case 'panLeft':
      scale = 1.2;
      offsetX = 50 - progress * 100; // Pan from 50 to -50
      break;
    default:
      scale = 1;
  }

  // Calculate crossfade opacity
  let opacity = 1;
  if (slideTime < transitionDuration) {
    // Fade in
    opacity = slideTime / transitionDuration;
  } else if (slideTime > currentSlide.duration - transitionDuration && slideIndex < slides.length - 1) {
    // Fade out
    opacity = (currentSlide.duration - slideTime) / transitionDuration;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
  ctx.scale(scale, scale);

  // Calculate size to fill canvas
  const imgAspect = img.width / img.height;
  const canvasAspect = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (imgAspect > canvasAspect) {
    drawWidth = height * imgAspect;
  } else {
    drawHeight = width / imgAspect;
  }

  ctx.drawImage(
    img,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  // Draw caption if present
  if (currentSlide.caption) {
    const captionColor = props.captionColor || '#ffffff';
    const captionBg = props.captionBackgroundColor || 'rgba(0, 0, 0, 0.7)';

    ctx.save();
    ctx.fillStyle = captionBg;
    ctx.fillRect(40, height - 120, width - 80, 80);

    ctx.fillStyle = captionColor;
    ctx.font = '32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentSlide.caption, width / 2, height - 80);
    ctx.restore();
  }
}

/**
 * Check if MediaRecorder export is supported
 */
export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
         typeof MediaRecorder.isTypeSupported === 'function';
}
