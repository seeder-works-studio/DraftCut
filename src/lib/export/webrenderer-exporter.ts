/**
 * Export using @remotion/web-renderer for browser-based rendering
 * This is the proper way to render Remotion compositions in the browser
 */

import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { ProjectSpec } from '@/lib/spec/types';

export interface WebRendererExportOptions {
  quality?: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
  skipBrokenImages?: boolean; // If true, continue export even if some images fail to load
}

/**
 * Validate that an image URL can be loaded
 */
async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Extract all image URLs from the spec and validate them
 */
async function validateSpecImages(
  spec: ProjectSpec,
  assetBlobUrls: Record<string, string>
): Promise<{ valid: boolean; invalidUrls: string[] }> {
  const imageUrls = new Set<string>();

  // Check skill clips for image URLs
  for (const track of spec.composition.tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'skill' && clip.skillProps) {
        // Check for logoAssetId (BrandLogo, IntroTitleCard, OutroCTA)
        if ('logoAssetId' in clip.skillProps) {
          const logoId = clip.skillProps.logoAssetId as string;
          const logoUrl = assetBlobUrls[logoId] || logoId;
          // Only validate external URLs (not blob URLs)
          if (logoUrl && !logoUrl.startsWith('blob:')) {
            imageUrls.add(logoUrl);
          }
        }

        // Check for backgroundImage
        if ('backgroundImage' in clip.skillProps) {
          const bgImage = clip.skillProps.backgroundImage as string;
          if (bgImage && !bgImage.startsWith('blob:')) {
            imageUrls.add(bgImage);
          }
        }

        // Check for images array (ImageSlideshow)
        if ('images' in clip.skillProps && Array.isArray(clip.skillProps.images)) {
          for (const img of clip.skillProps.images as any[]) {
            if (img?.assetId) {
              const imgUrl = assetBlobUrls[img.assetId] || img.assetId;
              if (imgUrl && !imgUrl.startsWith('blob:')) {
                imageUrls.add(imgUrl);
              }
            }
          }
        }
      }
    }
  }

  // Validate all unique URLs
  const invalidUrls: string[] = [];
  for (const url of imageUrls) {
    const isValid = await validateImageUrl(url);
    if (!isValid) {
      console.warn(`[WebRenderer] Invalid or unreachable image URL: ${url}`);
      invalidUrls.push(url);
    }
  }

  return {
    valid: invalidUrls.length === 0,
    invalidUrls,
  };
}

/**
 * Export video using Remotion's web renderer
 */
export async function exportWithWebRenderer(
  data: { spec: ProjectSpec; assetBlobUrls: Record<string, string> },
  options: WebRendererExportOptions = {}
): Promise<Blob> {
  const { spec, assetBlobUrls } = data;
  const { quality = 'high', onProgress } = options;

  console.log('[WebRenderer] Starting export with Remotion web renderer');
  console.log('[WebRenderer] Spec:', spec);
  console.log('[WebRenderer] Quality:', quality);

  // Validate all image URLs before rendering
  console.log('[WebRenderer] Validating image URLs...');
  const validation = await validateSpecImages(spec, assetBlobUrls);
  if (!validation.valid) {
    if (options.skipBrokenImages) {
      console.warn(`[WebRenderer] Warning: ${validation.invalidUrls.length} image(s) failed to load and will be skipped:\n${validation.invalidUrls.join('\n')}`);
    } else {
      const errorMsg = `Cannot export: ${validation.invalidUrls.length} image(s) failed to load:\n${validation.invalidUrls.join('\n')}\n\nThese images need to be fixed or removed before export.`;
      console.error('[WebRenderer]', errorMsg);
      throw new Error(errorMsg);
    }
  } else {
    console.log('[WebRenderer] All images validated successfully');
  }

  // Import the timeline composition component
  const { TimelineComposition } = await import('@/skills/remotion/TimelineComposition');

  // Calculate total frames
  const durationInFrames = Math.ceil(spec.canvas.duration * spec.canvas.fps);

  console.log('[WebRenderer] Rendering composition:', {
    width: spec.canvas.width,
    height: spec.canvas.height,
    fps: spec.canvas.fps,
    durationInFrames,
  });

  try {
    // Render the composition using Remotion's web renderer
    const { getBlob } = await renderMediaOnWeb({
      composition: {
        component: TimelineComposition,
        durationInFrames,
        fps: spec.canvas.fps,
        width: spec.canvas.width,
        height: spec.canvas.height,
        calculateMetadata: null,
        id: 'timeline',
        defaultProps: {
          spec,
          assetBlobUrls,
        },
      },
      inputProps: {
        spec,
        assetBlobUrls,
      },
      onProgress: (progressData) => {
        console.log('[WebRenderer] Progress:', progressData);
        // renderMediaOnWeb progress is a number between 0 and 1
        if (typeof progressData === 'number') {
          onProgress?.(progressData);
        } else if (progressData && typeof progressData === 'object' && 'progress' in progressData) {
          onProgress?.((progressData as any).progress);
        }
      },
    });

    console.log('[WebRenderer] Rendering complete, getting blob');
    const blob = await getBlob();
    console.log('[WebRenderer] Blob ready:', blob.size, 'bytes');

    return blob;
  } catch (error) {
    console.error('[WebRenderer] Render failed:', error);
    throw error;
  }
}

/**
 * Check if web renderer is supported
 */
export function isWebRendererSupported(): boolean {
  // Check if browser supports WebCodecs
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}
