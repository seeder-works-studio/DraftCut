import Anthropic from '@anthropic-ai/sdk';
import { validateProjectSpec } from '@/lib/spec/validator';
import { buildSystemPrompt } from './prompt';
import type { Asset, ProjectSpec } from '@/lib/spec/types';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import type { ChatMessage } from '@/stores/chat-store';

interface ChatResult {
  displayText: string;
  spec: ProjectSpec | null;
}

function buildChatSystemPrompt(
  assets: Asset[],
  currentSpec: ProjectSpec
): string {
  const base = buildSystemPrompt(assets, currentSpec.brandKit);

  return [
    base,
    '',
    'EDITING MODE:',
    'You are now in editing/chat mode. The user will ask you to modify the existing video spec.',
    '',
    'CURRENT SPEC:',
    '```json',
    JSON.stringify(currentSpec, null, 2),
    '```',
    '',
    'RESPONSE FORMAT:',
    'When the user asks for changes, respond with:',
    '1. A brief explanation of what you changed (1-2 sentences)',
    '2. The COMPLETE updated JSON spec in a ```json code block',
    '',
    'If the user asks a question that does NOT require spec changes (e.g. "what skills are available?"), respond with just text, no JSON block.',
    '',
    'IMPORTANT:',
    '- Always output the COMPLETE spec, not a partial diff',
    '- Preserve all existing clips/tracks not mentioned in the request',
    '- Update metadata.modified to current ISO timestamp',
    '- Keep the same assets array unless the user asks to add/remove assets',
  ].join('\n');
}

function convertMessages(
  messages: ChatMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function parseResponse(text: string): ChatResult {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);

  if (!jsonMatch) {
    return { displayText: text.trim(), spec: null };
  }

  const displayText = text.replace(/```json\s*[\s\S]*?```/, '').trim();
  let jsonText = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonText);

    // Sanitize assets
    if (Array.isArray(parsed.assets)) {
      parsed.assets = parsed.assets.filter(
        (a: unknown) =>
          typeof a === 'object' &&
          a !== null &&
          'id' in a &&
          'type' in a &&
          'filename' in a
      );
    } else {
      parsed.assets = [];
    }

    const spec = validateProjectSpec(parsed);
    return {
      displayText: displayText || 'Updated the video spec.',
      spec,
    };
  } catch {
    return {
      displayText:
        displayText ||
        text.trim() +
          '\n\n(Note: I tried to update the spec but the JSON was invalid. Please try again.)',
      spec: null,
    };
  }
}

export async function chatEditSpec(
  messages: ChatMessage[],
  currentSpec: ProjectSpec,
  assets: Asset[],
  config: AIProviderConfig
): Promise<ChatResult> {
  const systemPrompt = buildChatSystemPrompt(assets, currentSpec);
  const convertedMessages = convertMessages(messages);

  let responseText: string;

  if (config.provider === 'claude') {
    const client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      temperature: 0.7,
      system: systemPrompt,
      messages: convertedMessages,
    });

    responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    const baseURLs: Record<string, string> = {
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      cerebras: 'https://api.cerebras.ai/v1/chat/completions',
    };

    const response = await fetch(
      config.baseURL || baseURLs[config.provider] || baseURLs.openai,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...convertedMessages,
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    responseText = data.choices[0].message.content;
  }

  return parseResponse(responseText);
}
