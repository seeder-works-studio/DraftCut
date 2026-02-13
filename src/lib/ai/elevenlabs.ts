/**
 * ElevenLabs integration for voice narration and sound effects
 *
 * Text-to-Speech: Generate voice narration from text
 * Sound Effects: Generate sound effects from text descriptions
 */

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

// Popular voice IDs (users can also use custom voices from their account)
export const ELEVENLABS_VOICES = {
  // Professional narration voices
  rachel: 'RMKl0SjlPJI9PgBWXn3O', // Female, calm, articulate
  adam: 'pNInz6obpgDQGcFmaJgB',  // Male, deep, professional
  domi: 'AZnzlk1XvdvUeBnXmlld',  // Female, strong, confident
  elli: 'MF3mGyEYCl7XYWbV9V6O',  // Female, young, energetic
  josh: 'TxGEqnHWrfWFTfGW9XjX',  // Male, young, friendly
  arnold: 'VR6AewLTigWG4xSOukaG', // Male, crisp, authoritative
  antoni: 'ErXwobaYiN019PkySvjV', // Male, warm, well-rounded
  sam: 'yoZ06aMxZJJ28mfd3POQ',   // Male, raspy, dynamic
};

/**
 * Generate voice narration using ElevenLabs Text-to-Speech
 */
export async function generateVoiceNarration(
  text: string,
  apiKey: string,
  voiceId: string = ELEVENLABS_VOICES.rachel,
  options?: {
    stability?: number;      // 0-1, lower = more expressive
    similarityBoost?: number; // 0-1, higher = closer to original voice
    style?: number;          // 0-1, style exaggeration
  }
): Promise<Blob> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const requestBody = {
    text,
    model_id: 'eleven_turbo_v2_5', // Fast, high-quality model
    voice_settings: {
      stability: options?.stability ?? 0.5,
      similarity_boost: options?.similarityBoost ?? 0.75,
      style: options?.style ?? 0.0,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${errorText}`);
  }

  return await response.blob();
}

/**
 * Generate sound effects using ElevenLabs Sound Effects API
 */
export async function generateSoundEffect(
  description: string,
  apiKey: string,
  options?: {
    durationSeconds?: number; // Duration of the sound effect
    promptInfluence?: number; // 0-1, how much to follow the prompt
  }
): Promise<Blob> {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';

  const requestBody = {
    text: description,
    duration_seconds: options?.durationSeconds ?? 5.0,
    prompt_influence: options?.promptInfluence ?? 0.3,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs Sound Effect failed: ${errorText}`);
  }

  return await response.blob();
}

/**
 * Get available voices from user's ElevenLabs account
 */
export async function getAvailableVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ElevenLabs voices');
  }

  const data = await response.json();
  return data.voices || [];
}

/**
 * Helper to detect if user is requesting voice narration
 */
export function isVoiceNarrationRequest(message: string): boolean {
  const keywords = [
    'voice',
    'narration',
    'voiceover',
    'voice over',
    'speak',
    'say',
    'narrate',
    'tts',
    'text to speech',
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Helper to detect if user is requesting sound effects
 */
export function isSoundEffectRequest(message: string): boolean {
  const keywords = [
    'sound effect',
    'sfx',
    'sound of',
    'audio effect',
    'whoosh',
    'swoosh',
    'ding',
    'chime',
    'transition sound',
  ];

  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}
