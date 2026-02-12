export interface ScrapeResult {
  title: string;
  description: string;
  images: { url: string; alt: string }[];
  colors: string[];
  textContent: string;
  url: string;
}

export interface WebsiteData {
  images: File[];
  colors: string[];
  textContent: string;
  title: string;
  url: string;
}

export async function processWebsiteUrl(url: string): Promise<WebsiteData> {
  // Scrape the website
  const scrapeRes = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
  if (!scrapeRes.ok) {
    const err = await scrapeRes.json().catch(() => ({ error: 'Scrape failed' }));
    throw new Error(err.error || 'Failed to scrape website');
  }

  const data: ScrapeResult = await scrapeRes.json();

  // Download top images (max 5) via proxy
  const imagesToDownload = data.images.slice(0, 5);
  const downloadedImages: File[] = [];

  for (const img of imagesToDownload) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;

      const blob = await res.blob();
      // Skip tiny blobs (likely broken or tracking pixels)
      if (blob.size < 1000) continue;

      // Derive filename from URL
      const urlPath = new URL(img.url).pathname;
      const ext = urlPath.split('.').pop()?.split('?')[0] || 'jpg';
      const baseName = img.alt?.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30) || 'website-image';
      const filename = `${baseName}.${ext}`;

      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      downloadedImages.push(file);
    } catch {
      // Skip failed image downloads silently
    }
  }

  return {
    images: downloadedImages,
    colors: data.colors,
    textContent: data.textContent,
    title: data.title,
    url: data.url,
  };
}
