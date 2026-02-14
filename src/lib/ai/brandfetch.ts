/**
 * Brandfetch API integration for brand assets
 * API Docs: https://docs.brandfetch.com/brand-api/overview
 */

const BRANDFETCH_API_BASE = 'https://api.brandfetch.io/v2';

export interface BrandfetchLogo {
  type: 'logo' | 'symbol' | 'icon';
  theme: 'light' | 'dark';
  formats: Array<{
    src: string;
    background: string;
    format: 'svg' | 'png' | 'jpeg';
    size?: number;
    width?: number;
    height?: number;
  }>;
}

export interface BrandfetchColor {
  hex: string;
  type: string;
  brightness: number;
}

export interface BrandfetchFont {
  name: string;
  type: string;
  origin: string;
  originId?: string;
  weights?: number[];
}

export interface BrandfetchBrand {
  name: string;
  domain: string;
  claimed: boolean;
  description?: string;
  longDescription?: string;
  logos?: BrandfetchLogo[];
  colors?: BrandfetchColor[];
  fonts?: BrandfetchFont[];
  images?: Array<{
    type: string;
    formats: Array<{
      src: string;
      background: string;
      format: string;
      size?: number;
      width?: number;
      height?: number;
    }>;
  }>;
  links?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Search for a brand by name (returns domain matches)
 */
export async function searchBrandfetchBrand(
  name: string,
  apiKey: string
): Promise<Array<{ name: string; domain: string; brandId: string; claimed: boolean }>> {
  const url = `${BRANDFETCH_API_BASE}/search/${encodeURIComponent(name)}`;
  console.log('[Brandfetch] Searching brand:', name);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brandfetch search error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[Brandfetch] Found brands:', data.length);

  return data;
}

/**
 * Get full brand data by domain
 */
export async function getBrandfetchBrand(
  domain: string,
  apiKey: string
): Promise<BrandfetchBrand> {
  // Clean domain (remove protocol, trailing slash, etc.)
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .split('/')[0]; // Take only the domain part

  const url = `${BRANDFETCH_API_BASE}/brands/${encodeURIComponent(cleanDomain)}`;
  console.log('[Brandfetch] Fetching brand:', cleanDomain);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brandfetch API error (${response.status}): ${errorText}`);
  }

  const data: BrandfetchBrand = await response.json();
  console.log('[Brandfetch] Brand data:', {
    name: data.name,
    domain: data.domain,
    logos: data.logos?.length || 0,
    colors: data.colors?.length || 0,
    fonts: data.fonts?.length || 0,
  });

  return data;
}

/**
 * Get best logo from brand data (prefers SVG light theme logo)
 */
export function getBestLogo(brand: BrandfetchBrand): string | null {
  if (!brand.logos || brand.logos.length === 0) return null;

  // Prefer: logo type > light theme > SVG format
  const priorityOrder = [
    // 1st priority: Light theme logo in SVG
    (logo: BrandfetchLogo) =>
      logo.type === 'logo' &&
      logo.theme === 'light' &&
      logo.formats.find((f) => f.format === 'svg'),
    // 2nd priority: Any logo in SVG
    (logo: BrandfetchLogo) =>
      logo.type === 'logo' && logo.formats.find((f) => f.format === 'svg'),
    // 3rd priority: Light theme symbol in SVG
    (logo: BrandfetchLogo) =>
      logo.theme === 'light' && logo.formats.find((f) => f.format === 'svg'),
    // 4th priority: Any SVG
    (logo: BrandfetchLogo) => logo.formats.find((f) => f.format === 'svg'),
    // 5th priority: Any PNG
    (logo: BrandfetchLogo) => logo.formats.find((f) => f.format === 'png'),
  ];

  for (const matcher of priorityOrder) {
    for (const logo of brand.logos) {
      const format = matcher(logo);
      if (format) {
        return format.src;
      }
    }
  }

  // Fallback: first available format
  return brand.logos[0]?.formats[0]?.src || null;
}

/**
 * Get primary brand colors (hex values)
 */
export function getBrandColors(brand: BrandfetchBrand): string[] {
  if (!brand.colors || brand.colors.length === 0) return [];

  // Return up to 5 colors, sorted by brightness (darker first for better contrast)
  return brand.colors
    .sort((a, b) => a.brightness - b.brightness)
    .slice(0, 5)
    .map((c) => c.hex);
}

/**
 * Download logo and return as Blob
 */
export async function downloadBrandfetchLogo(logoUrl: string): Promise<Blob> {
  console.log('[Brandfetch] Downloading logo from:', logoUrl);

  // Try direct download first
  try {
    const response = await fetch(logoUrl);
    if (response.ok) {
      console.log('[Brandfetch] Direct download successful');
      return await response.blob();
    }
    console.warn('[Brandfetch] Direct download failed:', response.status);
  } catch (error) {
    console.log('[Brandfetch] Direct download error:', error);
  }

  // Fallback to proxy
  console.log('[Brandfetch] Trying proxy download...');
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(logoUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    let errorDetail = `${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.error || errorDetail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(`Failed to download logo via proxy: ${errorDetail}`);
  }

  console.log('[Brandfetch] Proxy download successful');
  return await response.blob();
}
