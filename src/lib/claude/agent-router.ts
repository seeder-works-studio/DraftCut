/**
 * AI Agent Router - Intelligently routes user requests to the right actions
 * Uses Claude's tool use to understand intent and execute actions
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AgentAction {
  type: 'fetch_logo' | 'fetch_stock_images' | 'generate_music' | 'generate_voice' | 'generate_sfx' | 'update_spec' | 'ask_clarification';
  params: Record<string, unknown>;
  reason: string;
}

export interface AgentPlan {
  actions: AgentAction[];
  needsClarification: boolean;
  clarificationQuestion?: string;
}

const AVAILABLE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'fetch_brand_logo',
    description: 'Fetch a brand logo and colors from a domain using Brandfetch. Use this when user mentions a brand/company and wants their logo.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'The domain to fetch from (e.g., "claude.ai", "google.com", "nba.com")',
        },
        brandName: {
          type: 'string',
          description: 'The brand name mentioned by user (e.g., "Claude", "Google", "NBA")',
        },
      },
      required: ['domain', 'brandName'],
    },
  },
  {
    name: 'fetch_stock_images',
    description: 'Fetch stock photos from Unsplash based on a search query. Use when user asks for images/photos of something.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for stock images (e.g., "ocean sunset", "business meeting", "nature")',
        },
        count: {
          type: 'number',
          description: 'Number of images to fetch (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_music',
    description: 'Generate or find background music. Use when user asks for music, soundtrack, or background audio.',
    input_schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the music style/mood (e.g., "upbeat electronic", "calm piano", "energetic rock")',
        },
        duration: {
          type: 'number',
          description: 'Desired duration in seconds',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'generate_voice_narration',
    description: 'Generate AI voice narration. Use when user asks for voiceover, narration, or speech.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to speak',
        },
        voice: {
          type: 'string',
          description: 'Voice style (e.g., "professional", "casual", "energetic")',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'generate_sound_effect',
    description: 'Generate a sound effect. Use when user asks for SFX like whoosh, ding, explosion, etc.',
    input_schema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the sound effect (e.g., "whoosh", "ding", "explosion")',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'update_video_spec',
    description: 'Update the video specification (timeline, clips, effects, etc). Use for any video editing requests.',
    input_schema: {
      type: 'object',
      properties: {
        changes: {
          type: 'string',
          description: 'Description of what changes to make to the video',
        },
      },
      required: ['changes'],
    },
  },
  {
    name: 'ask_clarification',
    description: 'Ask the user for clarification when the request is ambiguous or missing information.',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The clarification question to ask',
        },
        reason: {
          type: 'string',
          description: 'Why clarification is needed',
        },
      },
      required: ['question', 'reason'],
    },
  },
];

const SYSTEM_PROMPT = `You are an intelligent agent router for a video editing application.

Your job is to analyze user requests and determine which actions to take. You have access to these capabilities:

1. **fetch_brand_logo**: Fetch logos and brand colors from domains (via Brandfetch)
2. **fetch_stock_images**: Get stock photos from Unsplash
3. **generate_music**: Generate or find background music (via Jamendo/Beatoven/Replicate)
4. **generate_voice_narration**: Create AI voiceover (via ElevenLabs)
5. **generate_sound_effect**: Create sound effects (via ElevenLabs)
6. **update_video_spec**: Modify the video timeline, clips, effects
7. **ask_clarification**: Ask user for more information

IMPORTANT RULES:
- If user mentions a brand without a domain, use ask_clarification to get the domain
  Example: "get me claude logo" → ask "What's the domain? (e.g., claude.ai)"

- If user mentions a brand WITH the domain, use fetch_brand_logo immediately
  Example: "get logo from claude.ai" → fetch_brand_logo with domain="claude.ai"

- If user asks for a brand and wants to apply it, do BOTH actions in order:
  1. First: fetch_brand_logo to get the logo/colors
  2. Then: update_video_spec to apply the branding

- If the request is clear, execute actions immediately
- If ambiguous, use ask_clarification

- You can call MULTIPLE tools in one response if needed
- Think about the ORDER of operations (fetch assets BEFORE using them)

Examples:

User: "get me the nike logo"
→ ask_clarification: "What's the Nike domain? (e.g., nike.com)"

User: "fetch logo from nike.com"
→ fetch_brand_logo: { domain: "nike.com", brandName: "Nike" }

User: "add claude branding to the video"
→ ask_clarification: "To fetch Claude's branding, please provide the domain (e.g., claude.ai)"

User: "get logo from claude.ai and apply it"
→ 1. fetch_brand_logo: { domain: "claude.ai", brandName: "Claude" }
→ 2. update_video_spec: { changes: "Apply Claude branding with logo and colors" }

User: "add some nature photos"
→ fetch_stock_images: { query: "nature", count: 5 }

User: "make intro longer"
→ update_video_spec: { changes: "Make the intro longer" }

Be smart, be helpful, and always prefer clarity over guessing.`;

/**
 * Analyze user's request and create an execution plan
 */
export async function analyzeRequest(
  userMessage: string,
  apiKey: string,
  model: string = 'claude-sonnet-4-5-20250929'
): Promise<AgentPlan> {
  const anthropic = new Anthropic({ apiKey });

  console.log('[Agent Router] Analyzing request:', userMessage);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    tools: AVAILABLE_TOOLS,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  console.log('[Agent Router] Response:', JSON.stringify(response, null, 2));

  const actions: AgentAction[] = [];
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  // Parse tool uses from response
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const action: AgentAction = {
        type: block.name as AgentAction['type'],
        params: block.input as Record<string, unknown>,
        reason: `AI decided to use ${block.name}`,
      };

      actions.push(action);

      // Check if it's asking for clarification
      if (block.name === 'ask_clarification') {
        needsClarification = true;
        clarificationQuestion = (block.input as { question: string }).question;
      }

      console.log('[Agent Router] Action planned:', action);
    }
  }

  return {
    actions,
    needsClarification,
    clarificationQuestion,
  };
}

/**
 * Map of known brands to their domains (for common cases)
 */
export const BRAND_DOMAINS: Record<string, string> = {
  claude: 'claude.ai',
  anthropic: 'anthropic.com',
  google: 'google.com',
  microsoft: 'microsoft.com',
  apple: 'apple.com',
  meta: 'meta.com',
  facebook: 'facebook.com',
  twitter: 'twitter.com',
  x: 'x.com',
  amazon: 'amazon.com',
  nike: 'nike.com',
  nba: 'nba.com',
  spotify: 'spotify.com',
  netflix: 'netflix.com',
  youtube: 'youtube.com',
  instagram: 'instagram.com',
  tesla: 'tesla.com',
  nvidia: 'nvidia.com',
  openai: 'openai.com',
};

/**
 * Try to infer domain from brand name
 */
export function inferDomain(brandName: string): string | null {
  const normalized = brandName.toLowerCase().trim();
  return BRAND_DOMAINS[normalized] || null;
}
