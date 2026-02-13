/**
 * FAL.ai NanaBanana image generation
 * Fast AI image generation for scenes and concepts
 */

const FAL_API = 'https://fal.run';

export interface FalImageOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numImages?: number;
}

export interface FalImage {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

/**
 * Generate images using FAL.ai NanaBanana model
 * NanaBanana is optimized for fast generation (< 1s) with good quality
 */
export async function generateImagesWithNanaBanana(
  options: FalImageOptions,
  apiKey: string
): Promise<File[]> {
  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted',
    width = 1024,
    height = 1024,
    numImages = 1,
  } = options;

  // FAL.ai NanaBanana model endpoint
  const endpoint = `${FAL_API}/fal-ai/nanobanana`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      image_size: { width, height },
      num_images: numImages,
      enable_safety_checker: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FAL.ai API error: ${error}`);
  }

  const result = await response.json();

  // Download generated images
  const files: File[] = [];

  if (result.images && Array.isArray(result.images)) {
    for (let i = 0; i < result.images.length; i++) {
      const image = result.images[i];
      const imageUrl = image.url;

      if (!imageUrl) continue;

      try {
        // Download via proxy to avoid CORS issues
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const imageRes = await fetch(proxyUrl);

        if (!imageRes.ok) {
          console.warn(`Failed to download image ${i + 1}`);
          continue;
        }

        const blob = await imageRes.blob();
        const filename = `nanobanana-${Date.now()}-${i + 1}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        files.push(file);
      } catch (err) {
        console.warn(`Error downloading image ${i + 1}:`, err);
      }
    }
  }

  return files;
}

/**
 * Generate a single image with NanaBanana
 */
export async function generateSingleImage(
  prompt: string,
  apiKey: string,
  dimensions: { width: number; height: number } = { width: 1024, height: 1024 }
): Promise<File> {
  const files = await generateImagesWithNanaBanana(
    {
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      numImages: 1,
    },
    apiKey
  );

  if (files.length === 0) {
    throw new Error('No images generated');
  }

  return files[0];
}

/**
 * Generate images for multiple scene descriptions
 */
export async function generateSceneImages(
  scenes: string[],
  apiKey: string,
  dimensions: { width: number; height: number } = { width: 1920, height: 1080 }
): Promise<File[]> {
  const files: File[] = [];

  for (const scene of scenes) {
    try {
      const file = await generateSingleImage(scene, apiKey, dimensions);
      files.push(file);
    } catch (err) {
      console.warn(`Failed to generate image for scene "${scene}":`, err);
    }
  }

  return files;
}
