import Anthropic from '@anthropic-ai/sdk';
import { validateProjectSpec } from '@/lib/spec/validator';
import { buildSystemPrompt } from './prompt';
import type { Asset, BrandKit, ProjectSpec } from '@/lib/spec/types';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';

export async function generateVideoSpec(
  userPrompt: string,
  assets: Asset[],
  brandKit: BrandKit | undefined,
  config: AIProviderConfig
): Promise<ProjectSpec> {
  const systemPrompt = buildSystemPrompt(assets, brandKit);

  let jsonText: string;

  if (config.provider === 'claude') {
    const client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    jsonText =
      response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    const baseURLs: Record<string, string> = {
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
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    jsonText = data.choices[0].message.content;
  }

  // Clean up JSON if wrapped in markdown code blocks
  jsonText = jsonText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const spec = JSON.parse(jsonText);
  return validateProjectSpec(spec);
}
