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
import { saveAsset } from '@/lib/storage/assets';
import type { Asset, ProjectSpec } from '@/lib/spec/types';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import type { ChatMessage } from '@/stores/chat-store';
import { loadAPIKey } from '@/lib/storage/api-keys';

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

  // Check if user is requesting voice narration, sound effects, or music
  const isVoiceRequest = isVoiceNarrationRequest(lastUserMessage);
  const isSoundRequest = isSoundEffectRequest(lastUserMessage);
  const isMusicRequest = isMusicGenerationRequest(lastUserMessage);

  let generatedAudio: ChatWithAudioResult['generatedAudio'];

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

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `Voice narration generated and saved as asset "${asset.id}". You can now reference this audio in the video spec.`,
              timestamp: Date.now(),
            },
          ];
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

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `Sound effect found on Pixabay and saved as asset "${asset.id}" (${metadata.tags}, ${metadata.duration}s). You can now reference this audio in the video spec.`,
              timestamp: Date.now(),
            },
          ];

          console.log('[Pixabay] Sound effect retrieved successfully');
        } catch (pixabayError) {
          console.log('[Pixabay] Failed, trying ElevenLabs fallback');

          // Fallback to ElevenLabs
          if (elevenlabsKey) {
            try {
              const audioBlob = await generateSoundEffect(soundDescription, elevenlabsKey, {
                durationSeconds: 3.0,
                promptInfluence: 0.3,
              });
              const filename = `sound-effect-${Date.now()}.mp3`;

              const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
              const asset = await saveAsset(audioFile);
              const blobUrl = URL.createObjectURL(audioFile);

              generatedAudio = { asset, blobUrl };
              assets = [...assets, asset];

              messages = [
                ...messages,
                {
                  id: `system-${Date.now()}`,
                  role: 'assistant',
                  content: `Sound effect generated with ElevenLabs and saved as asset "${asset.id}". You can now reference this audio in the video spec.`,
                  timestamp: Date.now(),
                },
              ];

              console.log('[ElevenLabs] Sound effect generated successfully');
            } catch (error) {
              console.error('[ElevenLabs] Sound effect generation failed:', error);
            }
          }
        }
      } else if (elevenlabsKey) {
        // No Pixabay key, use ElevenLabs directly
        try {
          console.log('[ElevenLabs] Generating sound effect (no Pixabay key)');
          const audioBlob = await generateSoundEffect(soundDescription, elevenlabsKey, {
            durationSeconds: 3.0,
            promptInfluence: 0.3,
          });
          const filename = `sound-effect-${Date.now()}.mp3`;

          const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
          const asset = await saveAsset(audioFile);
          const blobUrl = URL.createObjectURL(audioFile);

          generatedAudio = { asset, blobUrl };
          assets = [...assets, asset];

          messages = [
            ...messages,
            {
              id: `system-${Date.now()}`,
              role: 'assistant',
              content: `Sound effect generated and saved as asset "${asset.id}". You can now reference this audio in the video spec.`,
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
    console.log('[Music] Request detected');

    // Try Jamendo first (instant, free), then generative AI (slow, paid)
    const jamendoKey = await loadAPIKey('jamendo');
    const beatovenKey = await loadAPIKey('beatoven');
    const replicateKey = await loadAPIKey('replicate');

    const musicDescription = extractMusicDescription(lastUserMessage);

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

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `Music found on Jamendo: "${metadata.name}" by ${metadata.artist_name} (${metadata.duration}s) - saved as asset "${asset.id}". You can now add this music to an audio track in the video spec.`,
            timestamp: Date.now(),
          },
        ];

        console.log('[Jamendo] Music retrieved successfully');
      } catch (jamendoError) {
        console.log('[Jamendo] Failed, trying generative AI fallback:', jamendoError);

        // Fallback to generative AI (Beatoven or Replicate)
        if (beatovenKey || replicateKey) {
          try {
            let audioBlob: Blob;
            let filename: string;
            let provider: string;

            if (beatovenKey) {
              console.log('[Beatoven] Generating music');
              audioBlob = await generateMusicBeatoven(musicDescription, beatovenKey);
              filename = `music-beatoven-${Date.now()}.mp3`;
              provider = 'Beatoven';
            } else if (replicateKey) {
              console.log('[Replicate] Generating music');
              const genDuration = duration || 20;
              audioBlob = await generateMusic(musicDescription, genDuration, replicateKey);
              filename = `music-replicate-${Date.now()}.wav`;
              provider = 'Replicate';
            } else {
              throw new Error('No generative music API key available');
            }

            const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
            const audioFile = new File([audioBlob], filename, { type: mimeType });
            const asset = await saveAsset(audioFile);
            const blobUrl = URL.createObjectURL(audioFile);

            generatedAudio = { asset, blobUrl };
            assets = [...assets, asset];

            messages = [
              ...messages,
              {
                id: `system-${Date.now()}`,
                role: 'assistant',
                content: `Music generated with ${provider} and saved as asset "${asset.id}". You can now add this music to an audio track in the video spec.`,
                timestamp: Date.now(),
              },
            ];

            console.log(`[${provider}] Music generated successfully`);
          } catch (error) {
            console.error('[Music] All providers failed:', error);
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
      // No Pixabay key, use generative AI directly
      try {
        let audioBlob: Blob;
        let filename: string;
        let provider: string;

        if (beatovenKey) {
          console.log('[Beatoven] Generating music (no Pixabay key)');
          audioBlob = await generateMusicBeatoven(musicDescription, beatovenKey);
          filename = `music-beatoven-${Date.now()}.mp3`;
          provider = 'Beatoven';
        } else if (replicateKey) {
          console.log('[Replicate] Generating music (no Pixabay key)');
          const genDuration = duration || 20;
          audioBlob = await generateMusic(musicDescription, genDuration, replicateKey);
          filename = `music-replicate-${Date.now()}.wav`;
          provider = 'Replicate';
        } else {
          throw new Error('No music API key available');
        }

        const mimeType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        const audioFile = new File([audioBlob], filename, { type: mimeType });
        const asset = await saveAsset(audioFile);
        const blobUrl = URL.createObjectURL(audioFile);

        generatedAudio = { asset, blobUrl };
        assets = [...assets, asset];

        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `Music generated with ${provider} and saved as asset "${asset.id}". You can now add this music to an audio track in the video spec.`,
            timestamp: Date.now(),
          },
        ];

        console.log(`[${provider}] Music generated successfully`);
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

  // Call normal chat with potentially updated assets and messages
  const result = await chatEditSpec(messages, currentSpec, assets, config);

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
