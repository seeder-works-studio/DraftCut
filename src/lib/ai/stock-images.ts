/**
 * Stock image integration with Pexels API
 * Free stock photos for video generation
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
}

/**
 * Search Pexels for stock photos
 */
export async function searchPexels(
  query: string,
  apiKey: string,
  options: {
    perPage?: number;
    page?: number;
    orientation?: 'landscape' | 'portrait' | 'square';
  } = {}
): Promise<PexelsPhoto[]> {
  const { perPage = 5, page = 1, orientation = 'landscape' } = options;

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', perPage.toString());
  url.searchParams.set('page', page.toString());
  url.searchParams.set('orientation', orientation);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pexels API error: ${error}`);
  }

  const data: PexelsSearchResponse = await response.json();
  return data.photos;
}

/**
 * Download stock image and convert to File
 */
export async function downloadStockImage(
  photo: PexelsPhoto,
  size: 'large' | 'medium' | 'small' = 'large'
): Promise<File> {
  // Use proxy to avoid CORS issues
  const imageUrl = photo.src[size];
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const blob = await response.blob();

  // Create filename from photographer and ID
  const filename = `pexels-${photo.photographer.replace(/[^a-zA-Z0-9]/g, '-')}-${photo.id}.jpg`;

  return new File([blob], filename, { type: 'image/jpeg' });
}

/**
 * Search and download stock images for a topic
 */
export async function getStockImagesForTopic(
  topic: string,
  apiKey: string,
  count: number = 5
): Promise<File[]> {
  const photos = await searchPexels(topic, apiKey, {
    perPage: count,
    orientation: 'landscape',
  });

  const files: File[] = [];

  for (const photo of photos) {
    try {
      const file = await downloadStockImage(photo, 'large');
      files.push(file);
    } catch (error) {
      console.warn(`Failed to download photo ${photo.id}:`, error);
    }
  }

  return files;
}

/**
 * Get curated (featured) photos from Pexels
 */
export async function getCuratedPexels(
  apiKey: string,
  options: {
    perPage?: number;
    page?: number;
  } = {}
): Promise<PexelsPhoto[]> {
  const { perPage = 5, page = 1 } = options;

  const url = new URL('https://api.pexels.com/v1/curated');
  url.searchParams.set('per_page', perPage.toString());
  url.searchParams.set('page', page.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pexels API error: ${error}`);
  }

  const data: PexelsSearchResponse = await response.json();
  return data.photos;
}
