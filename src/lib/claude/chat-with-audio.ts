/**
 * Enhanced chat that supports ElevenLabs voice narration and sound effects
 */

import { chatEditSpec } from './chat';
import {
  generateVoiceNarration,
  generateSoundEffect,
  isVoiceNarrationRequest,
  isSoundEffectRequest,
  ELEVENLABS_VOICES,
} from '@/lib/ai/elevenlabs';
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

  // Check if user is requesting voice narration or sound effects
  const isVoiceRequest = isVoiceNarrationRequest(lastUserMessage);
  const isSoundRequest = isSoundEffectRequest(lastUserMessage);

  let generatedAudio: ChatWithAudioResult['generatedAudio'];

  // Generate audio if requested and ElevenLabs key is available
  if (isVoiceRequest || isSoundRequest) {
    const elevenlabsKey = await loadAPIKey('elevenlabs');

    if (elevenlabsKey) {
      try {
        let audioBlob: Blob;
        let filename: string;

        if (isVoiceRequest) {
          // Extract the text to narrate (look for quotes or "say X" patterns)
          const textMatch =
            lastUserMessage.match(/"([^"]+)"/) ||
            lastUserMessage.match(/'([^']+)'/) ||
            lastUserMessage.match(/say\s+(.+?)(?:\.|$)/i) ||
            lastUserMessage.match(/narrate\s+(.+?)(?:\.|$)/i);

          const textToNarrate = textMatch
            ? textMatch[1].trim()
            : 'Voice narration placeholder';

          // Use default voice (Rachel - professional female)
          audioBlob = await generateVoiceNarration(
            textToNarrate,
            elevenlabsKey,
            ELEVENLABS_VOICES.rachel
          );
          filename = `voice-narration-${Date.now()}.mp3`;
        } else {
          // Sound effect request
          // Extract the sound description
          const soundMatch =
            lastUserMessage.match(/sound (?:of |effect )?(.+?)(?:\.|$)/i) ||
            lastUserMessage.match(/sfx\s+(.+?)(?:\.|$)/i);

          const soundDescription = soundMatch
            ? soundMatch[1].trim()
            : lastUserMessage;

          audioBlob = await generateSoundEffect(soundDescription, elevenlabsKey, {
            durationSeconds: 3.0,
            promptInfluence: 0.3,
          });
          filename = `sound-effect-${Date.now()}.mp3`;
        }

        // Save as asset
        const audioFile = new File([audioBlob], filename, { type: 'audio/mpeg' });
        const asset = await saveAsset(audioFile);

        // Create blob URL for immediate use
        const blobUrl = URL.createObjectURL(audioFile);

        generatedAudio = { asset, blobUrl };

        // Add to assets array for AI to reference
        assets = [...assets, asset];

        // Add system message to let AI know audio was generated
        messages = [
          ...messages,
          {
            id: `system-${Date.now()}`,
            role: 'assistant',
            content: `Audio generated successfully and saved as asset "${asset.id}". You can now reference this audio in the video spec.`,
            timestamp: new Date().toISOString(),
          },
        ];
      } catch (error) {
        console.error('ElevenLabs generation failed:', error);
        // Continue with normal chat - AI will respond that audio generation failed
      }
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
