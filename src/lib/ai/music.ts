const REPLICATE_API = 'https://api.replicate.com/v1/predictions';
const MUSICGEN_MODEL = 'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedbbe';

export async function generateMusic(
  prompt: string,
  duration: number,
  apiKey: string
): Promise<Blob> {
  // Create prediction
  const createRes = await fetch(REPLICATE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: MUSICGEN_MODEL.split(':')[1],
      input: {
        prompt,
        duration: Math.min(duration, 30),
        model_version: 'stereo-melody-large',
        output_format: 'wav',
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error: ${err}`);
  }

  const prediction = await createRes.json();
  let pollUrl: string = prediction.urls?.get || `${REPLICATE_API}/${prediction.id}`;

  // Poll until complete
  const maxAttempts = 60; // ~2 minutes at 2s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const status = await pollRes.json();

    if (status.status === 'succeeded') {
      const audioUrl = status.output;
      if (!audioUrl) throw new Error('No audio output from MusicGen');

      // Download audio via proxy to avoid CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(audioUrl)}`;
      const audioRes = await fetch(proxyUrl);
      if (!audioRes.ok) throw new Error('Failed to download generated audio');

      return await audioRes.blob();
    }

    if (status.status === 'failed' || status.status === 'canceled') {
      throw new Error(`Music generation ${status.status}: ${status.error || 'unknown error'}`);
    }
  }

  throw new Error('Music generation timed out');
}
