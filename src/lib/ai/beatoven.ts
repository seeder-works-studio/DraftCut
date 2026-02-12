const BEATOVEN_API = 'https://public-api.beatoven.ai/api/v1';

export async function generateMusicBeatoven(
  prompt: string,
  apiKey: string
): Promise<Blob> {
  // Step 1: Start composition
  const composeRes = await fetch(`${BEATOVEN_API}/tracks/compose`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      format: 'mp3',
    }),
  });

  if (!composeRes.ok) {
    const err = await composeRes.text();
    throw new Error(`Beatoven API error: ${err}`);
  }

  const { task_id } = await composeRes.json();
  if (!task_id) throw new Error('Beatoven: no task_id returned');

  // Step 2: Poll until composed
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await fetch(`${BEATOVEN_API}/tasks/${task_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const task = await pollRes.json();

    if (task.status === 'composed') {
      const trackUrl = task.meta?.track_url;
      if (!trackUrl) throw new Error('Beatoven: no track_url in response');

      // Step 3: Download the track
      const audioRes = await fetch(trackUrl);
      if (!audioRes.ok) throw new Error('Failed to download Beatoven track');

      return await audioRes.blob();
    }

    if (task.status === 'failed' || task.status === 'error') {
      throw new Error(`Beatoven composition failed: ${task.error || 'unknown error'}`);
    }
  }

  throw new Error('Beatoven composition timed out');
}
