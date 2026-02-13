/**
 * Jamendo API integration for royalty-free music
 * API Docs: https://developer.jamendo.com/v3.0/docs
 */

const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0';

export interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  album_name: string;
  audio: string; // Download URL
  audiodownload: string; // High quality download URL
  image: string;
  shareurl: string;
  license_ccurl: string;
}

interface JamendoSearchResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    warnings: string;
    results_count: number;
  };
  results: JamendoTrack[];
}

/**
 * Search for music tracks on Jamendo
 */
export async function searchJamendoMusic(
  query: string,
  clientId: string,
  options?: {
    limit?: number;
    order?: 'popularity_total' | 'popularity_week' | 'releasedate' | 'buzzrate';
    minDuration?: number;
    maxDuration?: number;
  }
): Promise<JamendoTrack[]> {
  const params = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    limit: String(options?.limit || 10),
    order: options?.order || 'popularity_total',
    search: query,
    audioformat: 'mp32', // MP3 320kbps
  });

  // Add duration filters if specified
  if (options?.minDuration) {
    params.append('duration_min', String(options.minDuration));
  }
  if (options?.maxDuration) {
    params.append('duration_max', String(options.maxDuration));
  }

  const url = `${JAMENDO_API_BASE}/tracks/?${params}`;
  console.log('[Jamendo] Search URL:', url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jamendo API error (${response.status}): ${errorText}`);
  }

  const data: JamendoSearchResponse = await response.json();

  if (data.headers.status !== 'success') {
    throw new Error(
      `Jamendo API error: ${data.headers.error_message || 'Unknown error'}`
    );
  }

  console.log('[Jamendo] Found tracks:', data.results.length);

  return data.results;
}

/**
 * Download audio file from Jamendo
 */
export async function downloadJamendoTrack(audioUrl: string): Promise<Blob> {
  console.log('[Jamendo] Downloading track from:', audioUrl);

  // Try direct download first (Jamendo supports CORS)
  try {
    console.log('[Jamendo] Attempting direct download...');
    const response = await fetch(audioUrl);

    if (response.ok) {
      console.log('[Jamendo] Direct download successful');
      return await response.blob();
    }

    console.warn('[Jamendo] Direct download failed:', response.status);
  } catch (directError) {
    console.warn('[Jamendo] Direct download error:', directError);
  }

  // Fallback to proxy
  console.log('[Jamendo] Trying proxy download...');
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(audioUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Failed to download Jamendo track via proxy: ${response.status}`);
  }

  console.log('[Jamendo] Proxy download successful');
  return await response.blob();
}

/**
 * Search and download the best matching music track
 */
export async function getJamendoMusic(
  description: string,
  clientId: string,
  duration?: number
): Promise<{ blob: Blob; metadata: JamendoTrack }> {
  console.log('[Jamendo] Searching music:', description);

  const results = await searchJamendoMusic(description, clientId, {
    limit: 10,
    order: 'popularity_total',
    minDuration: duration ? Math.max(duration - 30, 0) : undefined,
    maxDuration: duration ? duration + 30 : undefined,
  });

  if (results.length === 0) {
    throw new Error('No music found on Jamendo matching your description');
  }

  // Get the first (most popular) result
  const track = results[0];
  console.log('[Jamendo] Found track:', {
    name: track.name,
    artist: track.artist_name,
    duration: track.duration,
    audio: track.audio,
    audiodownload: track.audiodownload,
  });

  // Use the standard audio URL (more reliable than audiodownload)
  // Jamendo audio URLs work better through proxy
  let audioUrl = track.audio || track.audiodownload;

  // Ensure URL doesn't have trailing slash (can cause issues)
  if (audioUrl.endsWith('/')) {
    audioUrl = audioUrl.slice(0, -1);
  }

  console.log('[Jamendo] Using audio URL:', audioUrl);
  const blob = await downloadJamendoTrack(audioUrl);

  return { blob, metadata: track };
}

/**
 * Get multiple track options for user to choose from
 */
export async function getJamendoMusicOptions(
  description: string,
  clientId: string,
  limit: number = 5
): Promise<JamendoTrack[]> {
  console.log('[Jamendo] Getting music options for:', description);

  const results = await searchJamendoMusic(description, clientId, {
    limit,
    order: 'popularity_total',
  });

  console.log('[Jamendo] Found', results.length, 'options');

  return results;
}
