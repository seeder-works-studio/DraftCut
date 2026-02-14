/**
 * Enhanced chat that supports ElevenLabs voice narration and sound effects,
 * plus music generation via Beatoven or Replicate
 */

import { chatEditSpec } from './chat';
import {
  generateVoiceNarration,
  generateSoundEffect,
  isVoiceNarrationRequest,
  isSoundEffectRequest,
  ELEVENLABS_VOICES,
} from '@/lib/ai/elevenlabs';
import { generateMusic } from '@/lib/ai/music';
import { generateMusicBeatoven } from '@/lib/ai/beatoven';
import { getPixabaySoundEffect } from '@/lib/ai/pixabay';
import { getJamendoMusic } from '@/lib/ai/jamendo';
import { processWebsiteUrl } from '@/lib/ai/website';
import { getUnsplashPhotos } from '@/lib/ai/unsplash';
import { saveAsset } from '@/lib/storage/assets';
import type { Asset, ProjectSpec } from '@/lib/spec/types';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import type { ChatMessage } from '@/stores/chat-store';
import { loadAPIKey } from '@/lib/storage/api-keys';
import { analyzeRequest, inferDomain } from './agent-router';

interface ChatWithAudioResult {
  displayText: string;
  spec: ProjectSpec | null;
  generatedAudio?: {
    asset: Asset;
    blobUrl: string;
  };
}

/**
 * Enhanced chat that can generate voice narration and sound effects
 */
export async function chatEditSpecWithAudio(
  messages: ChatMessage[],
  currentSpec: ProjectSpec,
  assets: Asset[],
  config: AIProviderConfig
): Promise<ChatWithAudioResult> {
  const lastUserMessage = messages
    .filter((m) => m.role === 'user')
    .pop()?.content || '';

  // Check if user is requesting voice narration, sound effects, music, logo fetch, or stock images
  const isVoiceRequest = isVoiceNarrationRequest(lastUserMessage);
  const isSoundRequest = isSoundEffectRequest(lastUserMessage);
  const isMusicRequest = isMusicGenerationRequest(lastUserMessage);
  const isLogoRequest = isLogoFetchRequest(lastUserMessage);
  const isStockRequest = isStockImageRequest(lastUserMessage);

  let generatedAudio: ChatWithAudioResult['generatedAudio'];
  let updatedSpec = currentSpec; // Will be updated if audio is added, logo is fetched, or images are added

  // Generate audio if requested (voice or sound effects)
  if (isVoiceRequest || isSoundRequest) {
    if (isVoiceRequest) {
      // Voice narration - only ElevenLabs supports this
      const elevenlabsKey = await loadAPIKey('elevenlabs');

      if (elevenlabsKey) {
        try {
          // Extract the text to narrate
          const textMatch =
            lastUserMessage.match(/"([^"]+)"/) ||
            lastUserMessage.match(/'([^']+)'/) ||
            lastUserMessage.match(/say\s+(.+?)(?:\.|$)/i) ||
            lastUserMessage.match(/narrate\s+(.+?)(?:\.|$)/i);

          const textToNarrate = textMatch
            ? textMatch[1].trim()
            : 'Voice narration placeholder';

          console.log('[ElevenLabs] Generating voice narration');

          const audioBlob = await generateVoiceNarration(
            textToNarrate,
            elevenlabsKey,
            ELEVENLABS_VOICES.rachel
          );
          const filename = `voice-narration-${Date.now()}.mp3`;

          // Save as asset
          const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
          const asset = await saveAsset(audioFile);
          const blobUrl = URL.createObjectURL(audioFile);

          generatedAudio = { asset, blobUrl };
          assets = [...assets, asset];

          // Estimate duration based on text length (rough: ~150 words/min = ~2.5 words/sec)
          const wordCount = textToNarrate.split(/\s+/).length;
          const estimatedDuration = Math.max(wordCount / 2.5, 2); // At least 2 seconds

          // Automatically add voice narration to spec
          updatedSpec = addAudioToSpec(updatedSpec, asset, estimatedDuration);

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `✓ Added voice narration to timeline: "${textToNarrate.substring(0, 50)}..." (~${Math.round(estimatedDuration)}s)`,
              timestamp: Date.now(),
            },
          ];

          console.log('[ElevenLabs] Voice narration generated and added to timeline');
        } catch (error) {
          console.error('[ElevenLabs] Voice generation failed:', error);
        }
      } else {
        console.log('[Voice] No ElevenLabs API key found');
      }
    } else {
      // Sound effect request - try Pixabay first, then ElevenLabs
      const pixabayKey = await loadAPIKey('pixabay');
      const elevenlabsKey = await loadAPIKey('elevenlabs');

      const soundDescription = extractSoundEffectDescription(lastUserMessage);

      // Try Pixabay first
      if (pixabayKey) {
        try {
          console.log('[Pixabay] Searching for sound effect');
          const { blob, metadata } = await getPixabaySoundEffect(soundDescription, pixabayKey);

          const filename = `pixabay-sfx-${metadata.id}.mp3`;
          const audioFile = new File([blob], filename, { type: 'audio/mpeg' });
          const asset = await saveAsset(audioFile);
          const blobUrl = URL.createObjectURL(audioFile);

          generatedAudio = { asset, blobUrl };
          assets = [...assets, asset];

          // Automatically add sound effect to spec
          updatedSpec = addAudioToSpec(updatedSpec, asset, metadata.duration);

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `✓ Added sound effect to timeline: "${metadata.tags}" (${metadata.duration}s)`,
              timestamp: Date.now(),
            },
          ];

          console.log('[Pixabay] Sound effect retrieved and added to timeline');
        } catch (pixabayError) {
          console.log('[Pixabay] Failed, trying ElevenLabs fallback');

          // Fallback to ElevenLabs
          if (elevenlabsKey) {
            try {
              const sfxDuration = 3.0;
              const audioBlob = await generateSoundEffect(soundDescription, elevenlabsKey, {
                durationSeconds: sfxDuration,
                promptInfluence: 0.3,
              });
              const filename = `sound-effect-${Date.now()}.mp3`;

              const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
              const asset = await saveAsset(audioFile);
              const blobUrl = URL.createObjectURL(audioFile);

              generatedAudio = { asset, blobUrl };
              assets = [...assets, asset];

              // Automatically add sound effect to spec
              updatedSpec = addAudioToSpec(updatedSpec, asset, sfxDuration);

              messages = [
                ...messages,
                {
                  id: `system-${Date.now()}`,
                  role: 'assistant',
                  content: `✓ Added sound effect to timeline: "${soundDescription.substring(0, 50)}" (${sfxDuration}s, via ElevenLabs)`,
                  timestamp: Date.now(),
                },
              ];

              console.log('[ElevenLabs] Sound effect generated and added to timeline');
            } catch (error) {
              console.error('[ElevenLabs] Sound effect generation failed:', error);
            }
          }
        }
      } else if (elevenlabsKey) {
        // No Pixabay key, use ElevenLabs directly
        try {
          console.log('[ElevenLabs] Generating sound effect (no Pixabay key)');
          const sfxDuration = 3.0;
          const audioBlob = await generateSoundEffect(soundDescription, elevenlabsKey, {
            durationSeconds: sfxDuration,
            promptInfluence: 0.3,
          });
          const filename = `sound-effect-${Date.now()}.mp3`;

          const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
          const asset = await saveAsset(audioFile);
          const blobUrl = URL.createObjectURL(audioFile);

          generatedAudio = { asset, blobUrl };
          assets = [...assets, asset];

          // Automatically add sound effect to spec
          updatedSpec = addAudioToSpec(updatedSpec, asset, sfxDuration);

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `✓ Added sound effect to timeline: "${soundDescription.substring(0, 50)}" (${sfxDuration}s)`,
              timestamp: Date.now(),
            },
          ];
        } catch (error) {
          console.error('[ElevenLabs] Sound effect generation failed:', error);
        }
      } else {
        console.log('[Sound Effect] No Pixabay or ElevenLabs API key found');
      }
    }
  }

  // Generate music if requested
  if (isMusicRequest) {
    console.group('🎵 MUSIC GENERATION REQUEST');
    console.log('📝 User message:', lastUserMessage);

    // Try Jamendo first (instant, free), then generative AI (slow, paid)
    const jamendoKey = await loadAPIKey('jamendo');
    const beatovenKey = await loadAPIKey('beatoven');
    const replicateKey = await loadAPIKey('replicate');

    console.log('🔑 Available API keys:');
    console.log('   • Jamendo:', jamendoKey ? '✅' : '❌');
    console.log('   • Beatoven:', beatovenKey ? '✅' : '❌');
    console.log('   • Replicate:', replicateKey ? '✅' : '❌');

    const musicDescription = extractMusicDescription(lastUserMessage);
    console.log('🎼 Music description:', musicDescription);

    // Extract duration if specified
    const durationMatch = lastUserMessage.match(/(\d+)\s*(?:second|sec|s)/i);
    const duration = durationMatch ? parseInt(durationMatch[1]) : undefined;

    // Try Jamendo first (instant, free stock music)
    if (jamendoKey) {
      try {
        console.log('[Jamendo] Searching for music:', musicDescription);
        const { blob, metadata } = await getJamendoMusic(musicDescription, jamendoKey, duration);

        const filename = `jamendo-${metadata.id}.mp3`;
        const audioFile = new File([blob], filename, { type: 'audio/mpeg' });
        const asset = await saveAsset(audioFile);
        const blobUrl = URL.createObjectURL(audioFile);

        generatedAudio = { asset, blobUrl };
        assets = [...assets, asset];

        // Automatically add audio to spec
        updatedSpec = addAudioToSpec(updatedSpec, asset, metadata.duration);

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `✓ Added music to timeline: "${metadata.name}" by ${metadata.artist_name} (${metadata.duration}s)`,
            timestamp: Date.now(),
          },
        ];

        console.log('✅ [Jamendo] Music retrieved and added to timeline');
        console.groupEnd(); // End music generation group
      } catch (jamendoError) {
        console.error('❌ [Jamendo] Failed:', jamendoError);
        console.log('🔄 Trying generative AI fallback...');

        // Fallback to generative AI (Beatoven or Replicate)
        if (beatovenKey || replicateKey) {
          try {
            let audioBlob: Blob;
            let filename: string;
            let provider: string;
            let musicDuration: number;

            if (beatovenKey) {
              console.log('[Beatoven] Generating music');
              audioBlob = await generateMusicBeatoven(musicDescription, beatovenKey);
              filename = `music-beatoven-${Date.now()}.mp3`;
              provider = 'Beatoven';
              musicDuration = duration || currentSpec.canvas.duration; // Use video duration as fallback
            } else if (replicateKey) {
              console.log('[Replicate] Generating music');
              const genDuration = duration || 20;
              audioBlob = await generateMusic(musicDescription, genDuration, replicateKey);
              filename = `music-replicate-${Date.now()}.wav`;
              provider = 'Replicate';
              musicDuration = genDuration;
            } else {
              throw new Error('No generative music API key available');
            }

            const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
            const audioFile = new File([audioBlob], filename, { type: mimeType });
            const asset = await saveAsset(audioFile);
            const blobUrl = URL.createObjectURL(audioFile);

            generatedAudio = { asset, blobUrl };
            assets = [...assets, asset];

            // Automatically add audio to spec
            currentSpec = addAudioToSpec(currentSpec, asset, musicDuration);

            messages = [
              ...messages,
              {
                id: `system-${Date.now()}`,
                role: 'assistant',
                content: `✓ Added ${provider} music to timeline (${musicDuration}s)`,
                timestamp: Date.now(),
              },
            ];

            console.log(`✅ [${provider}] Music generated and added to timeline`);
            console.groupEnd(); // End music generation group
          } catch (error) {
            console.error('❌ [Music] All providers failed:', error);
            console.groupEnd(); // End music generation group
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            messages = [
              ...messages,
              {
                id: `system-${Date.now()}`,
                role: 'assistant',
                content: `Music generation failed: ${errorMessage}. Please check your API keys.`,
                timestamp: Date.now(),
              },
            ];
          }
        }
      }
    } else if (beatovenKey || replicateKey) {
      // No Jamendo key, use generative AI directly
      try {
        let audioBlob: Blob;
        let filename: string;
        let provider: string;
        let musicDuration: number;

        if (beatovenKey) {
          console.log('[Beatoven] Generating music (no Jamendo key)');
          audioBlob = await generateMusicBeatoven(musicDescription, beatovenKey);
          filename = `music-beatoven-${Date.now()}.mp3`;
          provider = 'Beatoven';
          musicDuration = duration || currentSpec.canvas.duration;
        } else if (replicateKey) {
          console.log('[Replicate] Generating music (no Jamendo key)');
          const genDuration = duration || 20;
          audioBlob = await generateMusic(musicDescription, genDuration, replicateKey);
          filename = `music-replicate-${Date.now()}.wav`;
          provider = 'Replicate';
          musicDuration = genDuration;
        } else {
          throw new Error('No music API key available');
        }

        const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        const audioFile = new File([audioBlob], filename, { type: mimeType });
        const asset = await saveAsset(audioFile);
        const blobUrl = URL.createObjectURL(audioFile);

        generatedAudio = { asset, blobUrl };
        assets = [...assets, asset];

        // Automatically add audio to spec
        currentSpec = addAudioToSpec(currentSpec, asset, musicDuration);

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `✓ Added ${provider} music to timeline (${musicDuration}s)`,
            timestamp: Date.now(),
          },
        ];

        console.log(`[${provider}] Music generated and added to timeline`);
      } catch (error) {
        console.error('[Music] Generation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `Music generation failed: ${errorMessage}. Please check your API keys.`,
            timestamp: Date.now(),
          },
        ];
      }
    } else {
      console.log('[Music] No API keys found (Pixabay, Beatoven, or Replicate)');

      messages = [
        ...messages,
        {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `Music requires a Pixabay, Beatoven, or Replicate API key. Please add one in the settings.`,
          timestamp: Date.now(),
        },
      ];
    }
  }

  // Fetch logo from website if requested
  if (isLogoRequest) {
    const url = extractUrlFromMessage(lastUserMessage);

    if (url) {
      try {
        console.log('[Brand] Fetching brand assets from:', url);

        let logoFile: File | undefined;
        let brandColors: string[] | undefined;
        let brandName: string | undefined;
        let fetchMethod: string = 'Unknown';

        // Check if it's a direct image URL
        const isDirectImage = url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/i);

        // Try Brandfetch first (for domain URLs, not direct images)
        const brandfetchKey = await loadAPIKey('brandfetch');

        if (!isDirectImage && brandfetchKey) {
          try {
            console.log('[Brandfetch] Fetching brand data...');
            const { getBrandfetchBrand, getBestLogo, getBrandColors, downloadBrandfetchLogo } = await import('@/lib/ai/brandfetch');

            const brandData = await getBrandfetchBrand(url, brandfetchKey);
            const logoUrl = getBestLogo(brandData);

            if (!logoUrl) {
              throw new Error('No logo found in brand data');
            }

            console.log('[Brandfetch] Downloading logo:', logoUrl);
            const logoBlob = await downloadBrandfetchLogo(logoUrl);

            const ext = logoUrl.match(/\.(svg|png|jpg|jpeg)/i)?.[1] || 'png';
            const filename = `${brandData.domain.replace(/\./g, '-')}-logo.${ext}`;
            logoFile = new File([logoBlob], filename, {
              type: logoBlob.type || `image/${ext}`
            });

            brandColors = getBrandColors(brandData);
            brandName = brandData.name;
            fetchMethod = 'Brandfetch';

            console.log('[Brandfetch] Brand data:', {
              name: brandName,
              colors: brandColors,
              logo: filename,
            });
          } catch (brandfetchError) {
            console.warn('[Brandfetch] Failed, trying fallback:', brandfetchError);
            // Continue to fallback methods - don't re-throw
          }
        }

        // Fallback 1: Direct image download
        if (!logoFile && isDirectImage) {
          console.log('[Image] Direct image URL detected, downloading...');
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }

          const blob = await response.blob();
          const ext = url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)/i)?.[1] || 'png';
          const filename = `image-${Date.now()}.${ext}`;
          logoFile = new File([blob], filename, { type: blob.type || `image/${ext}` });
          fetchMethod = 'Direct download';
        }

        // Fallback 2: Web scraping
        if (!logoFile) {
          console.log('[Website] Scraping webpage for logo...');
          const websiteData = await processWebsiteUrl(url);

          if (websiteData.images.length === 0) {
            throw new Error('No images found on page');
          }

          logoFile = websiteData.images[0];
          brandColors = websiteData.colors;
          fetchMethod = 'Web scraping';
        }

        // Ensure we have a logo file
        if (!logoFile) {
          throw new Error('Failed to fetch logo from all sources');
        }

        const asset = await saveAsset(logoFile);
        const blobUrl = URL.createObjectURL(logoFile);

        console.log('[Logo] Asset created:', {
          assetId: asset.id,
          filename: asset.filename,
          blobUrl: blobUrl,
          fileSize: logoFile.size,
        });

        generatedAudio = { asset, blobUrl }; // Reuse generatedAudio to pass logo back
        assets = [...assets, asset];

        // Update brand kit with logo and colors
        updatedSpec = {
          ...updatedSpec,
          assets: [...updatedSpec.assets, asset], // Add logo to spec.assets
          brandKit: {
            ...updatedSpec.brandKit,
            logoAssetId: asset.id,
            primaryColor: brandColors?.[0] || updatedSpec.brandKit?.primaryColor,
            secondaryColor: brandColors?.[1] || updatedSpec.brandKit?.secondaryColor,
          },
          metadata: {
            ...updatedSpec.metadata,
            modified: new Date().toISOString(),
          },
        };

        console.log('[Logo] Updated spec with logo:', {
          logoAssetId: updatedSpec.brandKit?.logoAssetId,
          assetsCount: updatedSpec.assets.length,
          brandColors: [brandColors?.[0], brandColors?.[1]],
        });

        const hostname = new URL(url).hostname;
        const successMsg = brandName
          ? `✓ Fetched ${brandName} brand assets via ${fetchMethod}${brandColors ? ` (${brandColors.length} colors)` : ''}`
          : `✓ Fetched image from ${hostname} via ${fetchMethod}`;

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: successMsg,
            timestamp: Date.now(),
          },
        ];

        console.log('[Brand] Assets fetched and added to brand kit');
      } catch (error) {
        console.error('[Brand] Fetch failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Failed to fetch brand assets: ${errorMsg}`,
            timestamp: Date.now(),
          },
        ];
      }
    }
  }

  // Fetch stock images if requested
  if (isStockRequest) {
    const unsplashKey = await loadAPIKey('unsplash');

    if (unsplashKey) {
      try {
        const query = extractStockImageQuery(lastUserMessage);
        console.log('[StockImages] Fetching images for:', query);

        const photos = await getUnsplashPhotos(query, unsplashKey, 5);

        if (photos.length > 0) {
          // Save all photos as assets
          const photoAssets: Asset[] = [];
          for (let i = 0; i < photos.length; i++) {
            const { blob, metadata } = photos[i];
            const filename = `unsplash-${metadata.id}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            const asset = await saveAsset(file);
            const blobUrl = URL.createObjectURL(file);

            photoAssets.push(asset);
            assets = [...assets, asset];

            // Set blob URL for the first photo (to return to chat panel)
            if (i === 0 && !generatedAudio) {
              generatedAudio = { asset, blobUrl };
            }
          }

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `✓ Found ${photos.length} stock photos for "${query}". Photos saved as assets. You can add them to the timeline as an ImageSlideshow.`,
              timestamp: Date.now(),
            },
          ];

          console.log('[StockImages] Successfully fetched', photos.length, 'photos');
        } else {
          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `⚠️ Could not find stock images for "${query}"`,
              timestamp: Date.now(),
            },
          ];
        }
      } catch (error) {
        console.error('[StockImages] Failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Failed to fetch stock images: ${errorMsg}. Please add an Unsplash API key in settings.`,
            timestamp: Date.now(),
          },
        ];
      }
    } else {
      console.log('[StockImages] No Unsplash API key found');

      messages = [
        ...messages,
        {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `Stock images require an Unsplash API key. Please add one in the settings.`,
          timestamp: Date.now(),
        },
      ];
    }
  }

  // Call normal chat with potentially updated assets and spec
  const result = await chatEditSpec(messages, updatedSpec, assets, config);

  return {
    ...result,
    generatedAudio,
  };
}

/**
 * Extract text content from user message for voice narration
 * Looks for common patterns like:
 * - "Say 'hello world'"
 * - "Add narration: 'welcome to the video'"
 * - "Voice over saying 'this is great'"
 */
export function extractNarrationText(message: string): string | null {
  // Look for quoted text
  const quotedMatch =
    message.match(/"([^"]+)"/) ||
    message.match(/'([^']+)'/) ||
    message.match(/`([^`]+)`/);

  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  // Look for "say X" or "narrate X" patterns
  const sayMatch =
    message.match(/say\s+(.+?)(?:\.|$)/i) ||
    message.match(/narrate\s+(.+?)(?:\.|$)/i) ||
    message.match(/speak\s+(.+?)(?:\.|$)/i);

  if (sayMatch) {
    return sayMatch[1].trim();
  }

  return null;
}

/**
 * Extract sound effect description from user message
 */
export function extractSoundEffectDescription(message: string): string {
  // Look for "sound of X" or "sound effect X"
  const soundMatch =
    message.match(/sound (?:of |effect )?(.+?)(?:\.|$)/i) ||
    message.match(/sfx\s+(.+?)(?:\.|$)/i) ||
    message.match(/audio (?:of |effect )?(.+?)(?:\.|$)/i);

  if (soundMatch) {
    return soundMatch[1].trim();
  }

  // Return the whole message as description
  return message;
}

/**
 * Helper to detect if user is requesting music generation
 */
export function isMusicGenerationRequest(message: string): boolean {
  const keywords = [
    'music',
    'background music',
    'bgm',
    'soundtrack',
    'sound track', // Two words version
    'audio track',
    'background audio',
    'musical',
    'instrumental',
    'beat',
    'song',
    'theme music',
    'theme song',
  ];

  const lowerMessage = message.toLowerCase();

  // Check for music keywords
  const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));

  // Exclude if it's asking about existing music or just referencing music
  const isQuestion = /\b(what|which|where|when|how|why|is|are|do|does)\b/i.test(message);

  return hasKeyword && !isQuestion;
}

/**
 * Extract music description from user message
 */
export function extractMusicDescription(message: string): string {
  // Remove common prefixes
  let description = message
    .replace(/^(?:add|generate|create|make|give me|i want|i need)\s+/i, '')
    .replace(/^(?:a |an |some )?(?:background )?music\s+(?:that is |that's |with )?/i, '')
    .trim();

  // If we removed too much, use the full message
  if (description.length < 10) {
    description = message;
  }

  return description;
}

/**
 * Helper to detect if user is requesting stock images
 */
export function isStockImageRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const stockKeywords = /\b(stock|images?|photos?|pictures?)\b/i.test(message);
  const addKeywords = /\b(add|get|fetch|find|show|include)\b/i.test(message);

  // Check for patterns like "add images of X" or "stock photos of Y"
  const hasImagePattern = /(?:images?|photos?|pictures?)\s+(?:of|about|showing|with)/i.test(message);

  return (stockKeywords && addKeywords) || hasImagePattern;
}

/**
 * Extract search query from stock image request
 */
export function extractStockImageQuery(message: string): string {
  // Try to extract what comes after "of" or "about"
  const ofMatch = message.match(/(?:images?|photos?|pictures?)\s+(?:of|about|showing)\s+([^.,;!?]+)/i);
  if (ofMatch) {
    return ofMatch[1].trim();
  }

  // Try to extract quoted text
  const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    return (quotedMatch[1] || quotedMatch[2]).trim();
  }

  // Remove common action words and return what's left
  let query = message
    .replace(/^(?:add|get|fetch|find|show|include|give me|i want|i need)\s+/i, '')
    .replace(/^(?:some |a few |several )?(?:stock )?(?:images?|photos?|pictures?)\s+(?:of |about |showing )?/i, '')
    .trim();

  // If we removed too much, use original
  if (query.length < 3) {
    query = message;
  }

  return query;
}

/**
 * Helper to detect if user is requesting a logo from a website
 */
export function isLogoFetchRequest(message: string): boolean {
  const trimmed = message.trim();
  const lowerMessage = trimmed.toLowerCase();

  // 1. Check if message is JUST a URL with image extension
  const urlOnlyMatch = trimmed.match(/^(https?:\/\/[^\s]+)$/i);
  if (urlOnlyMatch) {
    const url = urlOnlyMatch[1].toLowerCase();
    if (
      url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/i) ||
      url.includes('/logo') ||
      url.includes('/icon') ||
      url.includes('image')
    ) {
      return true;
    }
  }

  // 2. Check if message is JUST a domain (e.g., "nba.com", "claude.ai")
  const domainOnlyMatch = trimmed.match(/^([\w-]+\.(com|org|net|ai|io|co|dev|app|tech))\s*$/i);
  if (domainOnlyMatch) {
    return true;
  }

  // 3. Check if message is a full URL to a domain (e.g., "https://nba.com")
  const fullDomainMatch = trimmed.match(/^https?:\/\/([\w-]+\.(com|org|net|ai|io|co|dev|app|tech))\/?$/i);
  if (fullDomainMatch) {
    return true;
  }

  // 4. Check for logo/image fetch keywords + URL/domain
  const hasLogoKeyword = /\b(logo|image|icon|branding)\b/i.test(message);
  const hasGetKeyword = /\b(get|fetch|grab|download|find|add)\b/i.test(message);
  const hasUrl = /\b(https?:\/\/[^\s]+|[\w-]+\.(com|org|net|ai|io|co|dev|app|tech))\b/i.test(message);

  // 5. Check for common brand names (suggest domain)
  const brandMentions = /\b(claude|anthropic|google|microsoft|apple|meta|amazon|nike|nba|spotify|netflix|twitter|facebook)\b/i.test(lowerMessage);

  if ((hasLogoKeyword || hasGetKeyword) && brandMentions && !hasUrl) {
    // User mentioned a brand but no URL - this will be caught by chat system
    // to suggest providing the domain
    console.log('[Logo Detection] Brand mentioned but no domain provided:', message);
    return false; // Let AI handle it by asking for domain
  }

  return (hasLogoKeyword || hasGetKeyword) && hasUrl;
}

/**
 * Extract URL from user message
 */
export function extractUrlFromMessage(message: string): string | null {
  // Match full URLs
  const fullUrlMatch = message.match(/https?:\/\/[^\s]+/i);
  if (fullUrlMatch) {
    let url = fullUrlMatch[0];
    // Remove trailing punctuation
    url = url.replace(/[.,;!?]+$/, '');
    return url;
  }

  // Match domain-only (e.g., "nba.com", "claude.ai")
  const domainMatch = message.match(/\b([\w-]+\.(?:com|org|net|io|co|ai|dev|app|tech))\b/i);
  if (domainMatch) {
    return `https://${domainMatch[1]}`;
  }

  return null;
}

/**
 * Automatically add audio asset to the project spec
 */
function addAudioToSpec(spec: ProjectSpec, asset: Asset, audioDuration: number): ProjectSpec {
  // Find or create audio track
  let audioTrack = spec.composition.tracks.find((t) => t.type === 'audio');

  if (!audioTrack) {
    // Create new audio track
    audioTrack = {
      id: 'audio-track-1',
      type: 'audio',
      clips: [],
    };
    spec.composition.tracks.push(audioTrack);
    console.log('[Audio] Created new audio track');
  }

  // Add audio clip to the track
  const audioClip = {
    id: `audio-clip-${Date.now()}`,
    type: 'audio' as const,
    assetId: asset.id,
    startTime: 0, // Start from beginning
    duration: Math.min(audioDuration, spec.canvas.duration), // Don't exceed video duration
  };

  audioTrack.clips.push(audioClip);
  console.log('[Audio] Added audio clip to track:', audioClip);

  // Note: Asset is NOT added to spec.assets here
  // It will be added by the chat panel after blob URL is registered
  // This prevents race condition where preview tries to play asset before blob URL is ready

  // Update modified timestamp
  spec.metadata.modified = new Date().toISOString();

  return spec;
}

/**
 * Agent-powered chat that uses AI to intelligently route requests
 * This is the next-generation version that replaces keyword matching
 */
export async function chatWithAgentRouter(
  messages: ChatMessage[],
  currentSpec: ProjectSpec,
  currentAssets: Asset[],
  aiConfig: AIProviderConfig
): Promise<{
  displayText: string;
  spec: ProjectSpec | null;
  generatedAudio: { asset: Asset; blobUrl: string } | null;
}> {
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  console.log('[Agent Chat] Processing request:', lastUserMessage);

  // Determine base URL based on provider
  let baseURL: string | undefined;
  if (aiConfig.provider === 'openrouter') {
    baseURL = 'https://openrouter.ai/api/v1';
  } else if (aiConfig.provider === 'cerebras') {
    baseURL = 'https://api.cerebras.ai/v1';
  } else if (aiConfig.provider === 'openai') {
    baseURL = 'https://api.openai.com/v1';
  }
  // For Claude/Anthropic, we'll use OpenRouter as a proxy
  else if (aiConfig.provider === 'claude') {
    // We can't use Anthropic SDK in browser, so fallback to OpenAI format
    baseURL = 'https://api.openai.com/v1';
  }

  // Use the agent router to analyze the request
  const plan = await analyzeRequest(
    lastUserMessage,
    aiConfig.apiKey,
    aiConfig.model,
    baseURL,
    aiConfig.provider // Pass provider so agent router knows which SDK to use
  );

  console.log('[Agent Chat] Execution plan:', plan);

  // If clarification is needed, return immediately
  if (plan.needsClarification) {
    return {
      displayText: plan.clarificationQuestion || 'Could you please provide more details?',
      spec: null,
      generatedAudio: null,
    };
  }

  // Execute actions in order
  let updatedSpec = currentSpec;
  let assets = [...currentAssets];
  let generatedAudio: { asset: Asset; blobUrl: string } | null = null;
  const actionResults: string[] = [];

  for (const action of plan.actions) {
    console.log('[Agent Chat] Executing action:', action.type, action.params);

    try {
      switch (action.type) {
        case 'fetch_brand_logo': {
          const { domain, brandName } = action.params as { domain: string; brandName: string };

          // Infer domain if needed
          const actualDomain = domain || inferDomain(brandName);

          if (!actualDomain) {
            actionResults.push(`⚠️ Couldn't determine domain for "${brandName}". Please provide it (e.g., "${brandName.toLowerCase()}.com")`);
            continue;
          }

          // Fetch via Brandfetch
          const brandfetchKey = await loadAPIKey('brandfetch');

          if (!brandfetchKey) {
            actionResults.push('⚠️ Brandfetch API key not configured. Please add it in settings.');
            continue;
          }

          const { getBrandfetchBrand, getBestLogo, getBrandColors, downloadBrandfetchLogo } = await import('@/lib/ai/brandfetch');

          const brandData = await getBrandfetchBrand(actualDomain, brandfetchKey);
          const logoUrl = getBestLogo(brandData);

          if (!logoUrl) {
            actionResults.push(`⚠️ No logo found for ${brandName}`);
            continue;
          }

          const logoBlob = await downloadBrandfetchLogo(logoUrl);
          const ext = logoUrl.match(/\.(svg|png|jpg|jpeg)/i)?.[1] || 'png';
          const filename = `${brandData.domain.replace(/\./g, '-')}-logo.${ext}`;
          const logoFile = new File([logoBlob], filename, {
            type: logoBlob.type || `image/${ext}`
          });

          const asset = await saveAsset(logoFile);
          const blobUrl = URL.createObjectURL(logoFile);

          generatedAudio = { asset, blobUrl };
          assets = [...assets, asset];

          const brandColors = getBrandColors(brandData);

          // Update spec with logo and colors
          updatedSpec = {
            ...updatedSpec,
            assets: [...updatedSpec.assets, asset],
            brandKit: {
              ...updatedSpec.brandKit,
              logoAssetId: asset.id,
              primaryColor: brandColors?.[0] || updatedSpec.brandKit?.primaryColor,
              secondaryColor: brandColors?.[1] || updatedSpec.brandKit?.secondaryColor,
            },
            metadata: {
              ...updatedSpec.metadata,
              modified: new Date().toISOString(),
            },
          };

          actionResults.push(`✓ Fetched ${brandName} logo and brand colors`);
          break;
        }

        case 'fetch_stock_images': {
          const { query, count = 5 } = action.params as { query: string; count?: number };

          const unsplashKey = await loadAPIKey('unsplash');

          if (!unsplashKey) {
            actionResults.push('⚠️ Unsplash API key not configured. Please add it in settings.');
            continue;
          }

          const photos = await getUnsplashPhotos(query, unsplashKey, count);

          for (let i = 0; i < photos.length; i++) {
            const { blob, metadata } = photos[i];
            const filename = `unsplash-${metadata.id}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            const asset = await saveAsset(file);
            const assetBlobUrl = URL.createObjectURL(file);

            assets = [...assets, asset];

            if (i === 0 && !generatedAudio) {
              generatedAudio = { asset, blobUrl: assetBlobUrl };
            }
          }

          actionResults.push(`✓ Fetched ${photos.length} stock photos for "${query}"`);
          break;
        }

        case 'update_spec': {
          const { changes } = action.params as { changes: string };

          // Call the regular chat system to update the spec
          const result = await chatEditSpec(messages, updatedSpec, assets, aiConfig);

          if (result.spec) {
            updatedSpec = result.spec;
            actionResults.push('✓ Updated video');
          }

          break;
        }

        // Add other action types as needed (music, voice, etc.)

        default:
          console.warn('[Agent Chat] Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('[Agent Chat] Action failed:', action.type, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      actionResults.push(`❌ ${action.type} failed: ${errorMsg}`);
    }
  }

  return {
    displayText: actionResults.join('\n'),
    spec: updatedSpec,
    generatedAudio,
  };
}
