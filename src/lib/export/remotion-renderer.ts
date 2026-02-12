/**
 * Browser-based Remotion skill rendering using canvas capture + MediaRecorder.
 *
 * This renders a Remotion skill component frame-by-frame into a WebM video blob.
 * Since @remotion/renderer is Node.js-only, we use the browser's MediaRecorder API.
 */

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  onProgress?: (progress: number) => void;
}

export async function renderSkillToBlob(
  renderFrame: (frame: number, canvas: HTMLCanvasElement) => Promise<void>,
  options: RenderOptions
): Promise<Blob> {
  const { width, height, fps, durationInFrames, onProgress } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  for (let frame = 0; frame < durationInFrames; frame++) {
    await renderFrame(frame, canvas);
    onProgress?.(frame / durationInFrames);

    // Yield to the browser to allow encoding
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  recorder.stop();

  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });
}
