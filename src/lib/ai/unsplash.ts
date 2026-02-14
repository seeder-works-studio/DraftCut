/**
 * Unsplash API integration for stock photos
 * API Docs: https://unsplash.com/documentation
 */

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

/**
 * Search for photos on Unsplash
 */
export async function searchUnsplashPhotos(
  query: string,
  accessKey: string,
  options?: {
    perPage?: number;
    page?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
  }
): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query,
    client_id: accessKey,
    per_page: String(options?.perPage || 10),
    page: String(options?.page || 1),
  });

  if (options?.orientation) {
    params.append('orientation', options.orientation);
  }

  const url = `https://api.unsplash.com/search/photos?${params}`;
  console.log('[Unsplash] Searching:', query);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unsplash API error (${response.status}): ${errorText}`);
  }

  const data: UnsplashSearchResponse = await response.json();
  console.log('[Unsplash] Found', data.results.length, 'photos');

  return data.results;
}

/**
 * Download a photo from Unsplash
 */
export async function downloadUnsplashPhoto(photoUrl: string): Promise<Blob> {
  console.log('[Unsplash] Downloading photo from:', photoUrl);

  // Try direct download first
  try {
    const response = await fetch(photoUrl);
    if (response.ok) {
      console.log('[Unsplash] Direct download successful');
      return await response.blob();
    }
    console.warn('[Unsplash] Direct download failed:', response.status);
  } catch (error) {
    console.log('[Unsplash] Direct download error:', error);
  }

  // Fallback to proxy
  console.log('[Unsplash] Trying proxy download...');
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photoUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    let errorDetail = `${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.error || errorDetail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(`Failed to download Unsplash photo via proxy: ${errorDetail}`);
  }

  console.log('[Unsplash] Proxy download successful');
  return await response.blob();
}

/**
 * Get multiple photos for a query
 */
export async function getUnsplashPhotos(
  query: string,
  accessKey: string,
  count: number = 5
): Promise<Array<{ blob: Blob; metadata: UnsplashPhoto }>> {
  const photos = await searchUnsplashPhotos(query, accessKey, {
    perPage: count,
    orientation: 'landscape', // Best for video
  });

  if (photos.length === 0) {
    throw new Error(`No photos found on Unsplash for: ${query}`);
  }

  const results: Array<{ blob: Blob; metadata: UnsplashPhoto }> = [];

  for (const photo of photos) {
    try {
      // Use 'regular' size - good quality but not too large
      const blob = await downloadUnsplashPhoto(photo.urls.regular);
      results.push({ blob, metadata: photo });
    } catch (error) {
      console.error('[Unsplash] Failed to download photo:', photo.id, error);
      // Continue with other photos
    }
  }

  return results;
}
