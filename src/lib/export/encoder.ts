/**
 * Final video export pipeline.
 *
 * Phase 1 (current): Export project spec as JSON for external rendering.
 * Phase 2 (future): Render Remotion skills to WebM clips, composite with
 * Diffusion Studio Core, and export final video using WebCodecs.
 */

import type { ProjectSpec } from '@/lib/spec/types';

export interface ExportProgress {
  phase: 'rendering-skills' | 'compositing' | 'encoding' | 'done';
  progress: number; // 0-1
  message: string;
}

export async function exportProjectAsJSON(
  spec: ProjectSpec
): Promise<Blob> {
  const json = JSON.stringify(spec, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
