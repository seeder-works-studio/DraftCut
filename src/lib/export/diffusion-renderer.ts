/**
 * Diffusion Studios video export with hardware acceleration
 * Provides high-quality MP4 export using WebCodecs API
 */

import type { ProjectSpec, Clip } from '@/lib/spec/types';
import { exportWithMediaRecorder } from './mediarecorder-exporter';
import type * as DiffusionCore from '@diffusionstudio/core';

// Dynamic import to avoid SSR issues with browser-only APIs
let core: typeof DiffusionCore | null = null;

export interface DiffusionExportOptions {
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  fps?: number;
  format?: 'mp4' | 'webm';
  resolution?: number; // Scale multiplier (1 = native, 2 = 2x, 0.5 = half)
  onProgress?: (progress: number) => void;
}

export interface RenderContext {
  spec: ProjectSpec;
  assetBlobUrls: Record<string, string>;
}

/**
 * Quality preset bitrates (in bits per second)
 */
const QUALITY_PRESETS = {
  low: { video: 2_000_000, audio: 96_000 },    // 2 Mbps video, 96 kbps audio
  medium: { video: 5_000_000, audio: 128_000 }, // 5 Mbps video, 128 kbps audio
  high: { video: 10_000_000, audio: 192_000 },  // 10 Mbps video, 192 kbps audio
  ultra: { video: 25_000_000, audio: 256_000 }, // 25 Mbps video, 256 kbps audio
};

/**
 * Convert any color format to hex (Diffusion Studios only supports hex)
 */
function normalizeColorToHex(color: string): `#${string}` {
  // Already hex
  if (color.startsWith('#')) {
    return color as `#${string}`;
  }

  // Named colors
  if (color === 'transparent') {
    return '#000000'; // Use black for transparent
  }

  // LAB, RGB, HSL, etc - convert using canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const [r, g, b] = imageData.data;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}` as `#${string}`;
  } catch {
    // Fallback to black if conversion fails
    return '#000000';
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

/**
 * Export video using Diffusion Studios with hardware acceleration
 */
export async function exportWithDiffusionStudios(
  context: RenderContext,
  options: DiffusionExportOptions = {}
): Promise<Blob> {
  // Lazy load Diffusion Studios only in browser
  if (!core) {
    core = await import('@diffusionstudio/core');
  }

  const { assetBlobUrls } = context;

  // Sanitize all colors in spec to hex format (Diffusion Studios requirement)
  const spec = sanitizeSpecColors(context.spec);

  const quality = options.quality || 'high';
  const fps = options.fps || spec.canvas.fps;
  const resolution = options.resolution || 1;

  // Create composition
  const composition = new core.Composition({
    width: spec.canvas.width,
    height: spec.canvas.height,
    background: normalizeColorToHex(spec.canvas.backgroundColor || '#000000'),
  });

  // Process tracks and add clips
  for (const track of spec.composition.tracks) {
    // Create layer for this track
    const layer = composition.createLayer();
    await composition.add(layer);

    // Add clips to layer
    for (const clip of track.clips) {
      await addClipToLayer(layer, clip, assetBlobUrls, spec);
    }
  }

  // Configure encoder based on quality preset
  const preset = QUALITY_PRESETS[quality];
  const encoder = new core.Encoder(composition, {
    format: options.format === 'webm' ? 'webm' : 'mp4',
    video: {
      codec: options.format === 'webm' ? 'vp9' : 'avc',
      fps,
      bitrate: preset.video,
      resolution,
    },
    audio: {
      codec: options.format === 'webm' ? 'opus' : 'aac',
      bitrate: preset.audio,
      sampleRate: 48000,
      numberOfChannels: 2,
    },
  });

  // Set up progress callback
  if (options.onProgress) {
    encoder.onProgress = (progress) => {
      options.onProgress!(progress.progress);
    };
  }

  // Render to blob
  const result = await encoder.render();

  if (result.type === 'success' && result.data) {
    return result.data;
  } else if (result.type === 'error') {
    throw result.error;
  } else if (result.type === 'canceled') {
    throw new Error('Export was canceled');
  }

  throw new Error('Export failed: No data returned');
}


/**
 * Add a clip to a Diffusion Studios layer
 */
async function addClipToLayer(
  layer: DiffusionCore.Layer,
  clip: Clip,
  assetBlobUrls: Record<string, string>,
  spec: ProjectSpec
): Promise<void> {
  // Handle different clip types
  if (clip.type === 'video') {
    await addVideoClip(layer, clip, assetBlobUrls);
  } else if (clip.type === 'audio') {
    await addAudioClip(layer, clip, assetBlobUrls);
  } else if (clip.type === 'image') {
    await addImageClip(layer, clip, assetBlobUrls);
  } else if (clip.type === 'skill') {
    // Skills need to be pre-rendered to video blobs
    await addSkillClip(layer, clip, spec, assetBlobUrls);
  }
}

/**
 * Add video clip to layer
 */
async function addVideoClip(
  layer: DiffusionCore.Layer,
  clip: Clip,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!core) throw new Error('Diffusion Studios not loaded');
  if (!clip.assetId) return;

  const blobUrl = assetBlobUrls[clip.assetId];
  if (!blobUrl) {
    console.error(`Video asset blob URL not found: ${clip.assetId}`);
    throw new Error(`Video asset not loaded: ${clip.assetId}. Please ensure all assets are uploaded.`);
  }

  // Create video source
  let source: DiffusionCore.VideoSource;
  try {
    source = await core.Source.from<DiffusionCore.VideoSource>(blobUrl);
  } catch (err) {
    console.error(`Failed to load video source from ${blobUrl}:`, err);
    throw new Error(`Failed to load video asset: ${clip.assetId}`);
  }

  // Create video clip with trim range
  const videoClip = new core.VideoClip(source, {
    range: (clip.trimStart !== undefined && clip.trimEnd !== undefined)
      ? [clip.trimStart, clip.trimEnd]
      : undefined,
  });

  // Set timing
  videoClip.start = clip.startTime;
  videoClip.end = clip.startTime + clip.duration;

  // Apply transforms if present
  if (clip.transform) {
    if (clip.transform.x !== undefined) videoClip.x = clip.transform.x;
    if (clip.transform.y !== undefined) videoClip.y = clip.transform.y;
    if (clip.transform.scale !== undefined) videoClip.scale = clip.transform.scale;
    if (clip.transform.opacity !== undefined) videoClip.opacity = clip.transform.opacity;
  }

  await layer.add(videoClip);
}

/**
 * Add audio clip to layer
 */
async function addAudioClip(
  layer: DiffusionCore.Layer,
  clip: Clip,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!core) throw new Error('Diffusion Studios not loaded');
  if (!clip.assetId) return;

  const blobUrl = assetBlobUrls[clip.assetId];
  if (!blobUrl) {
    console.warn(`Audio asset not found: ${clip.assetId}`);
    return;
  }

  // Create audio source
  const source = await core.Source.from<DiffusionCore.AudioSource>(blobUrl);

  // Create audio clip with trim range and volume
  const audioClip = new core.AudioClip(source, {
    range: (clip.trimStart !== undefined && clip.trimEnd !== undefined)
      ? [clip.trimStart, clip.trimEnd]
      : undefined,
    volume: 1.0, // Volume property doesn't exist on Clip type
  });

  // Set timing
  audioClip.start = clip.startTime;
  audioClip.end = clip.startTime + clip.duration;

  await layer.add(audioClip);
}

/**
 * Add image clip to layer
 */
async function addImageClip(
  layer: DiffusionCore.Layer,
  clip: Clip,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!core) throw new Error('Diffusion Studios not loaded');
  if (!clip.assetId) return;

  const blobUrl = assetBlobUrls[clip.assetId];
  if (!blobUrl) {
    console.warn(`Image asset not found: ${clip.assetId}`);
    return;
  }

  // Create image source
  const source = await core.Source.from<DiffusionCore.ImageSource>(blobUrl);

  // Create image clip
  const imageClip = new core.ImageClip(source);

  // Set timing (images don't have natural duration)
  imageClip.start = clip.startTime;
  imageClip.end = clip.startTime + clip.duration;

  // Apply transforms if present
  if (clip.transform) {
    if (clip.transform.x !== undefined) imageClip.x = clip.transform.x;
    if (clip.transform.y !== undefined) imageClip.y = clip.transform.y;
    if (clip.transform.scale !== undefined) imageClip.scale = clip.transform.scale;
    if (clip.transform.opacity !== undefined) imageClip.opacity = clip.transform.opacity;
  }

  await layer.add(imageClip);
}

/**
 * Add skill clip to layer (pre-render Remotion skill to video)
 */
async function addSkillClip(
  layer: DiffusionCore.Layer,
  clip: Clip,
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<void> {
  if (!core) throw new Error('Diffusion Studios not loaded');

  // Pre-render the Remotion skill to a video blob using MediaRecorder
  const skillBlob = await renderSkillToBlob(clip, spec, assetBlobUrls);

  // Create a temporary blob URL for the rendered skill
  const skillBlobUrl = URL.createObjectURL(skillBlob);

  try {
    // Create video source from the rendered skill
    const source = await core.Source.from<DiffusionCore.VideoSource>(skillBlobUrl);

    // Create video clip for the skill
    const videoClip = new core.VideoClip(source);

    // Set timing
    videoClip.start = clip.startTime;
    videoClip.end = clip.startTime + clip.duration;

    // Apply transforms if present
    if (clip.transform) {
      if (clip.transform.x !== undefined) videoClip.x = clip.transform.x;
      if (clip.transform.y !== undefined) videoClip.y = clip.transform.y;
      if (clip.transform.scale !== undefined) videoClip.scale = clip.transform.scale;
      if (clip.transform.opacity !== undefined) videoClip.opacity = clip.transform.opacity;
    }

    await layer.add(videoClip);
  } finally {
    // Clean up the temporary blob URL
    URL.revokeObjectURL(skillBlobUrl);
  }
}

/**
 * Render a Remotion skill to a video blob
 */
async function renderSkillToBlob(
  clip: Clip,
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<Blob> {
  // Create a minimal spec containing just this skill clip
  const skillSpec: ProjectSpec = {
    ...spec,
    composition: {
      tracks: [
        {
          id: 'skill-track',
          type: 'overlay',
          clips: [clip],
        },
      ],
    },
  };

  // Use existing MediaRecorder exporter to render the skill
  return await exportWithMediaRecorder(
    { spec: skillSpec, assetBlobUrls },
    { quality: 'high' }
  );
}

/**
 * Check if browser supports Diffusion Studios requirements
 */
export function isDiffusionStudiosSupported(): boolean {
  // Check for WebCodecs API
  if (typeof VideoEncoder === 'undefined') {
    return false;
  }

  // Check for SharedArrayBuffer (requires CORS headers)
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  return true;
}

/**
 * Get export format recommendations based on browser support
 */
export function getRecommendedExportFormat(): {
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  reason: string;
} {
  if (isDiffusionStudiosSupported()) {
    return {
      format: 'mp4',
      quality: 'high',
      reason: 'Hardware-accelerated MP4 export with Diffusion Studios',
    };
  }

  return {
    format: 'webm',
    quality: 'medium',
    reason: 'Fallback to MediaRecorder (Diffusion Studios not available)',
  };
}
