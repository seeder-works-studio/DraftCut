/**
 * AI Agent Router - Intelligently routes user requests to the right actions
 * Uses Claude's tool use to understand intent and execute actions
 */

import OpenAI from 'openai';
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

const AVAILABLE_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function' as const,
    function: {
      name: 'fetch_brand_logo',
      description: 'Fetch a brand logo and colors from a domain using Brandfetch. Use this when user mentions a brand/company and wants their logo.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'fetch_stock_images',
      description: 'Fetch stock photos from Unsplash based on a search query. Use when user asks for images/photos of something.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_music',
      description: 'Generate or find background music. Use when user asks for music, soundtrack, or background audio.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_voice_narration',
      description: 'Generate AI voice narration. Use when user asks for voiceover, narration, or speech.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_sound_effect',
      description: 'Generate a sound effect. Use when user asks for SFX like whoosh, ding, explosion, etc.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_video_spec',
      description: 'Update the video specification (timeline, clips, effects, etc). Use for any video editing requests.',
      parameters: {
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_clarification',
      description: 'Ask the user for clarification when the request is ambiguous or missing information.',
      parameters: {
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

KNOWN BRANDS (automatically use these domains):
- claude, anthropic → claude.ai
- google → google.com
- microsoft → microsoft.com
- apple → apple.com
- meta, facebook → meta.com or facebook.com
- twitter, x → x.com
- amazon → amazon.com
- nike → nike.com
- nba → nba.com
- spotify → spotify.com
- netflix → netflix.com
- youtube → youtube.com
- instagram → instagram.com
- tesla → tesla.com
- nvidia → nvidia.com
- openai → openai.com

IMPORTANT RULES:
- If user mentions a KNOWN brand (see list above), automatically use the known domain - DON'T ask for clarification
  Example: "get me claude logo" → fetch_brand_logo with domain="claude.ai" (automatically)
  Example: "use nike branding" → fetch_brand_logo with domain="nike.com" (automatically)

- If user mentions an UNKNOWN brand without a domain, use ask_clarification to get the domain
  Example: "get me acme logo" → ask "What's the Acme domain? (e.g., acme.com)"

- If user mentions a brand WITH an explicit domain/URL, use fetch_brand_logo with that domain
  Example: "get logo from claude.ai" → fetch_brand_logo with domain="claude.ai"
  Example: "fetch logo from https://nike.com" → fetch_brand_logo with domain="nike.com"

- If user asks for a brand and wants to apply it, do BOTH actions in order:
  1. First: fetch_brand_logo to get the logo/colors
  2. Then: update_video_spec to apply the branding

- If the request is clear, execute actions immediately
- If ambiguous, use ask_clarification

- You can call MULTIPLE tools in one response if needed
- Think about the ORDER of operations (fetch assets BEFORE using them)

Examples:

User: "get me the nike logo"
→ fetch_brand_logo: { domain: "nike.com", brandName: "Nike" } (known brand, use automatically)

User: "add claude branding to the video"
→ 1. fetch_brand_logo: { domain: "claude.ai", brandName: "Claude" } (known brand)
→ 2. update_video_spec: { changes: "Apply Claude branding with logo and colors" }

User: "use anthropic logo and colors"
→ 1. fetch_brand_logo: { domain: "claude.ai", brandName: "Anthropic" } (known brand)
→ 2. update_video_spec: { changes: "Apply Anthropic branding with logo and colors" }

User: "get logo from acme.com"
→ fetch_brand_logo: { domain: "acme.com", brandName: "Acme" } (explicit domain provided)

User: "add xyz company branding"
→ ask_clarification: "To fetch XYZ Company's branding, please provide the domain (e.g., xyz.com)" (unknown brand)

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
  model: string = 'gpt-4-turbo-preview',
  baseURL?: string,
  provider?: string
): Promise<AgentPlan> {
  console.log('[Agent Router] Analyzing request:', userMessage);
  console.log('[Agent Router] Provider:', provider, 'Model:', model);

  const actions: AgentAction[] = [];
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  // Use Anthropic SDK for Claude
  if (provider === 'claude' || model.includes('claude')) {
    const anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Safe: user's own API key, not hardcoded
    });

    // Convert OpenAI tool format to Anthropic format
    const anthropicTools = AVAILABLE_TOOLS.map((tool) => {
      if (!('function' in tool)) throw new Error('Expected function tool');
      const fn = tool.function;
      return {
        name: fn.name,
        description: fn.description || '',
        input_schema: fn.parameters,
      };
    }) as Anthropic.Tool[];

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: anthropicTools,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    console.log('[Agent Router] Anthropic Response:', JSON.stringify(response, null, 2));

    // Parse tool uses from Anthropic response
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const action: AgentAction = {
          type: block.name as AgentAction['type'],
          params: block.input as Record<string, unknown>,
          reason: `AI decided to use ${block.name}`,
        };

        actions.push(action);

        if (block.name === 'ask_clarification') {
          needsClarification = true;
          clarificationQuestion = (block.input as { question: string }).question;
        }

        console.log('[Agent Router] Action planned:', action);
      }
    }
  } else {
    // Use OpenAI SDK for other providers (OpenAI, OpenRouter, Cerebras, etc.)
    const openai = new OpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.chat.completions.create({
      model,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      tools: AVAILABLE_TOOLS,
      tool_choice: 'auto',
    });

    console.log('[Agent Router] OpenAI Response:', JSON.stringify(response, null, 2));

    // Parse tool calls from OpenAI response
    const toolCalls = response.choices[0]?.message?.tool_calls || [];

    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        const action: AgentAction = {
          type: functionName as AgentAction['type'],
          params: functionArgs as Record<string, unknown>,
          reason: `AI decided to use ${functionName}`,
        };

        actions.push(action);

        if (functionName === 'ask_clarification') {
          needsClarification = true;
          clarificationQuestion = functionArgs.question as string;
        }

        console.log('[Agent Router] Action planned:', action);
      }
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
