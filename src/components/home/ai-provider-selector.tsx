'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveAPIKey, loadAPIKey } from '@/lib/storage/api-keys';

export interface AIProviderConfig {
  provider: 'claude' | 'openrouter' | 'cerebras' | 'openai';
  apiKey: string;
  baseURL?: string;
  model?: string;
}

const PROVIDERS = {
  claude: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-4-5-20250929',
    baseURL: undefined,
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1/chat/completions',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  },
  cerebras: {
    label: 'Cerebras',
    defaultModel: 'llama-4-scout-17b-16e-instruct',
    baseURL: 'https://api.cerebras.ai/v1/chat/completions',
  },
} as const;

interface AIProviderSelectorProps {
  config: AIProviderConfig;
  onChange: (config: AIProviderConfig) => void;
}

export function AIProviderSelector({
  config,
  onChange,
}: AIProviderSelectorProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    loadAPIKey(config.provider).then((key) => {
      if (key) {
        onChange({ ...config, apiKey: key });
      }
      setLoaded(true);
    });
  }, [config.provider, loaded]);

  const handleProviderChange = async (
    provider: AIProviderConfig['provider']
  ) => {
    const providerInfo = PROVIDERS[provider];
    const savedKey = (await loadAPIKey(provider)) || '';
    onChange({
      provider,
      apiKey: savedKey,
      model: providerInfo.defaultModel,
      baseURL: providerInfo.baseURL,
    });
  };

  const handleKeyChange = (apiKey: string) => {
    onChange({ ...config, apiKey });
    if (apiKey) {
      saveAPIKey(config.provider, apiKey);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">AI Provider</h2>

      <div className="space-y-2">
        <Label>Provider</Label>
        <Select
          value={config.provider}
          onValueChange={(v) =>
            handleProviderChange(v as AIProviderConfig['provider'])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDERS).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>API Key</Label>
        <Input
          type="password"
          placeholder="Enter your API key..."
          value={config.apiKey}
          onChange={(e) => handleKeyChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Stored locally in your browser. Never sent to any server.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Input
          value={config.model || ''}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
        />
      </div>
    </Card>
  );
}
