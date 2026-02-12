/**
 * Auto-captioning integration using Whisper API.
 *
 * Extracts audio from video, sends to transcription API,
 * and returns CaptionsPop-compatible caption data.
 */

import type { AIProviderConfig } from '@/components/home/ai-provider-selector';

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionSegment {
  text: string;
  startTime: number;
  duration: number;
  emphasizedWords?: number[];
}

export async function generateCaptions(
  audioBlob: Blob,
  config: AIProviderConfig
): Promise<CaptionSegment[]> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`);
  }

  const data = await response.json();
  const words: TranscriptionWord[] = data.words || [];

  // Group words into segments of ~5 words each
  const segments: CaptionSegment[] = [];
  const wordsPerSegment = 5;

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const group = words.slice(i, i + wordsPerSegment);
    if (group.length === 0) continue;

    const text = group.map((w) => w.word).join(' ');
    const startTime = group[0].start;
    const endTime = group[group.length - 1].end;

    segments.push({
      text,
      startTime,
      duration: endTime - startTime,
    });
  }

  return segments;
}

export async function extractAudioFromVideo(
  videoBlob: Blob
): Promise<Blob> {
  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoBlob);
  video.muted = false;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(video);
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);

  const recorder = new MediaRecorder(dest.stream, {
    mimeType: 'audio/webm',
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();
  video.play();

  await new Promise<void>((resolve) => {
    video.onended = () => {
      recorder.stop();
      resolve();
    };
  });

  URL.revokeObjectURL(video.src);
  await audioCtx.close();

  return new Blob(chunks, { type: 'audio/webm' });
}
