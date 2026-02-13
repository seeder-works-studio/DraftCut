/**
 * Pixabay API integration for music and sound effects
 * API Docs: https://pixabay.com/api/docs/
 */

const PIXABAY_API_BASE = 'https://pixabay.com/api';

export interface PixabayAudioResult {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  picture_small: string;
  picture_medium: string;
  picture_large: string;
  download_url: string;
  preview_url: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayAudioResult[];
}

/**
 * Search for music tracks on Pixabay
 */
export async function searchPixabayMusic(
  query: string,
  apiKey: string,
  options?: {
    minDuration?: number;
    maxDuration?: number;
    order?: 'popular' | 'latest';
  }
): Promise<PixabayAudioResult[]> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    per_page: '10',
    order: options?.order || 'popular',
  });

  const response = await fetch(`${PIXABAY_API_BASE}/?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pixabay API error: ${errorText}`);
  }

  const data: PixabaySearchResponse = await response.json();

  // Filter by duration if specified
  let results = data.hits || [];
  if (options?.minDuration) {
    results = results.filter((r) => r.duration >= options.minDuration!);
  }
  if (options?.maxDuration) {
    results = results.filter((r) => r.duration <= options.maxDuration!);
  }

  return results;
}

/**
 * Search for sound effects on Pixabay
 * Note: Pixabay's main API endpoint handles both music and sound effects
 * Use specific keywords to get sound effects
 */
export async function searchPixabaySoundEffects(
  query: string,
  apiKey: string
): Promise<PixabayAudioResult[]> {
  // Add "sound effect" to query to get better results
  const enhancedQuery = `${query} sound effect sfx`;

  const params = new URLSearchParams({
    key: apiKey,
    q: enhancedQuery,
    per_page: '10',
    order: 'popular',
  });

  const response = await fetch(`${PIXABAY_API_BASE}/?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pixabay API error: ${errorText}`);
  }

  const data: PixabaySearchResponse = await response.json();

  // Filter to only short audio clips (under 10 seconds) for sound effects
  const results = (data.hits || []).filter((r) => r.duration < 10);

  return results;
}

/**
 * Download audio file from Pixabay URL
 */
export async function downloadPixabayAudio(
  downloadUrl: string
): Promise<Blob> {
  // Use proxy to avoid CORS issues
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(downloadUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error('Failed to download Pixabay audio');
  }

  return await response.blob();
}

/**
 * Search and download the best matching music track
 */
export async function getPixabayMusic(
  description: string,
  apiKey: string,
  duration?: number
): Promise<{ blob: Blob; metadata: PixabayAudioResult }> {
  console.log('[Pixabay] Searching music:', description);

  const results = await searchPixabayMusic(description, apiKey, {
    minDuration: duration ? Math.max(duration - 10, 0) : undefined,
    maxDuration: duration ? duration + 10 : undefined,
  });

  if (results.length === 0) {
    throw new Error('No music found on Pixabay matching your description');
  }

  // Get the first (most popular) result
  const track = results[0];
  console.log('[Pixabay] Found track:', track.tags, `(${track.duration}s)`);

  const blob = await downloadPixabayAudio(track.download_url);

  return { blob, metadata: track };
}

/**
 * Search and download the best matching sound effect
 */
export async function getPixabaySoundEffect(
  description: string,
  apiKey: string
): Promise<{ blob: Blob; metadata: PixabayAudioResult }> {
  console.log('[Pixabay] Searching sound effect:', description);

  const results = await searchPixabaySoundEffects(description, apiKey);

  if (results.length === 0) {
    throw new Error('No sound effects found on Pixabay matching your description');
  }

  // Get the first (most popular) result
  const sfx = results[0];
  console.log('[Pixabay] Found SFX:', sfx.tags, `(${sfx.duration}s)`);

  const blob = await downloadPixabayAudio(sfx.download_url);

  return { blob, metadata: sfx };
}
