/**
 * Extract dominant colors from an image
 * Returns array of hex colors sorted by dominance
 */
export async function extractImageColors(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve([]);
          return;
        }

        // Scale down for performance (max 100x100)
        const scale = Math.min(100 / img.width, 100 / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Count colors (rounded to reduce variation)
        const colorCounts = new Map<string, number>();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Round to nearest 32 to group similar colors
          const rRounded = Math.round(r / 32) * 32;
          const gRounded = Math.round(g / 32) * 32;
          const bRounded = Math.round(b / 32) * 32;

          const colorKey = `${rRounded},${gRounded},${bRounded}`;
          colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
        }

        // Sort by count and take top 3
        const sortedColors = Array.from(colorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([rgb]) => {
            const [r, g, b] = rgb.split(',').map(Number);
            return rgbToHex(r, g, b);
          });

        URL.revokeObjectURL(img.src);
        resolve(sortedColors);
      } catch (error) {
        console.error('Color extraction error:', error);
        URL.revokeObjectURL(img.src);
        resolve([]);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve([]);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate relative luminance (for contrast checking)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Suggest a contrasting background color for a logo
 * Returns white or black depending on logo's dominant color
 */
export function suggestContrastingBackground(logoColors: string[]): string {
  if (logoColors.length === 0) return '#ffffff';

  const primaryColor = logoColors[0];
  const luminance = getLuminance(primaryColor);

  // If logo is light (luminance > 0.5), use dark background
  // If logo is dark (luminance <= 0.5), use light background
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

/**
 * Check if logo colors indicate it's mostly dark/light
 */
export function analyzeLogoLightness(logoColors: string[]): 'light' | 'dark' | 'mixed' {
  if (logoColors.length === 0) return 'mixed';

  const luminances = logoColors.map(getLuminance);
  const avgLuminance = luminances.reduce((a, b) => a + b, 0) / luminances.length;

  if (avgLuminance > 0.6) return 'light';
  if (avgLuminance < 0.4) return 'dark';
  return 'mixed';
}

/**
 * Ensure text color has sufficient contrast against background
 * Returns the provided textColor if it has good contrast (>= 4.5:1),
 * otherwise returns black or white depending on which has better contrast
 *
 * @param backgroundColor - Background color in hex format
 * @param textColor - Desired text color in hex format
 * @param minContrast - Minimum contrast ratio (default 4.5 for WCAG AA)
 * @returns Text color with guaranteed contrast
 */
export function ensureTextContrast(
  backgroundColor: string,
  textColor: string,
  minContrast: number = 4.5
): string {
  // Check current contrast
  const currentContrast = getContrastRatio(backgroundColor, textColor);

  // If contrast is good enough, use the provided color
  if (currentContrast >= minContrast) {
    return textColor;
  }

  // Otherwise, choose black or white based on which has better contrast
  const bgLuminance = getLuminance(backgroundColor);

  // Light backgrounds need dark text, dark backgrounds need light text
  return bgLuminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get the best contrasting text color for a background
 * Returns either black or white, whichever has better contrast
 *
 * @param backgroundColor - Background color in hex format
 * @returns Either '#000000' or '#ffffff'
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const bgLuminance = getLuminance(backgroundColor);
  return bgLuminance > 0.5 ? '#000000' : '#ffffff';
}
