'use client';

import { useEffect, useState } from 'react';

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

interface ModelOption {
  id: string;
  label: string;
  price: string;
}

const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', price: '$5 / $25' },
  { id: 'claude-opus-4-5-20250929', label: 'Claude Opus 4.5', price: '$5 / $25' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', price: '$3 / $15' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', price: '$3 / $15' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', price: '$1 / $5' },
  { id: 'claude-haiku-3-5-20241022', label: 'Claude Haiku 3.5', price: '$0.80 / $4' },
];

const PROVIDERS = {
  claude: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: CLAUDE_MODELS,
    baseURL: undefined,
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: null,
    baseURL: 'https://api.openai.com/v1/chat/completions',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
    models: null,
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  },
  cerebras: {
    label: 'Cerebras',
    defaultModel: 'llama-4-scout-17b-16e-instruct',
    models: null,
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

  const providerInfo = PROVIDERS[config.provider];
  const models = providerInfo.models;

  return (
    <div className="space-y-4">
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
        {models ? (
          <Select
            value={config.model || ''}
            onValueChange={(v) => onChange({ ...config, model: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span>{m.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {m.price}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={config.model || ''}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            placeholder="e.g. gpt-4o"
          />
        )}
      </div>
    </div>
  );
}
