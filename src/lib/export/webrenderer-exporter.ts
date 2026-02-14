/**
 * Export using @remotion/web-renderer for browser-based rendering
 * This is the proper way to render Remotion compositions in the browser
 */

import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { ProjectSpec } from '@/lib/spec/types';

export interface WebRendererExportOptions {
  quality?: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
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
