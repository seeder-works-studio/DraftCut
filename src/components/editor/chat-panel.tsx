'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChatStore, type ChatMessage } from '@/stores/chat-store';
import { useProjectStore } from '@/stores/project-store';
import { chatEditSpecWithAudio } from '@/lib/claude/chat-with-audio';
import { saveAPIKey, loadAPIKey, loadSetting, saveSetting } from '@/lib/storage/api-keys';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import { toast } from 'sonner';

interface ModelOption {
  id: string;
  label: string;
}

const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

const PROVIDERS: Record<
  string,
  { label: string; defaultModel: string; models: ModelOption[] | null }
> = {
  claude: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: CLAUDE_MODELS,
  },
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o', models: null },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
    models: null,
  },
  cerebras: {
    label: 'Cerebras',
    defaultModel: 'llama-4-scout-17b-16e-instruct',
    models: null,
  },
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "I generated your video. Ask me to make changes \u2014 try \"Make the intro longer\", \"Add voice narration saying 'hello'\", or \"Add a whoosh sound effect\".",
  timestamp: Date.now(),
};

export function ChatPanel() {
  const { messages, isGenerating, aiConfig, addMessage, setIsGenerating, setAiConfig } =
    useChatStore();
  const spec = useProjectStore((s) => s.spec);
  const assets = useProjectStore((s) => s.assets);
  const setSpec = useProjectStore((s) => s.setSpec);
  const addAsset = useProjectStore((s) => s.addAsset);
  const setAssetBlobUrl = useProjectStore((s) => s.setAssetBlobUrl);

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load AI config from IndexedDB on mount
  useEffect(() => {
    if (configLoaded) return;
    (async () => {
      const provider =
        ((await loadSetting('ai-provider')) as AIProviderConfig['provider']) ||
        'claude';
      const model =
        (await loadSetting('ai-model')) ||
        PROVIDERS[provider]?.defaultModel ||
        '';
      const apiKey = (await loadAPIKey(provider)) || '';
      setAiConfig({ provider, apiKey, model });
      setConfigLoaded(true);
    })();
  }, [configLoaded, setAiConfig]);

  // Seed welcome message (only once)
  useEffect(() => {
    if (messages.length === 0 && !messages.some(m => m.id === 'welcome')) {
      addMessage(WELCOME_MESSAGE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating || !spec) return;

    if (!aiConfig.apiKey) {
      toast.error('Please configure your API key in settings');
      setShowSettings(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    setIsGenerating(true);

    try {
      // Build message history (exclude welcome message for API call)
      const apiMessages = [...messages, userMessage].filter(
        (m) => m.id !== 'welcome'
      );

      const result = await chatEditSpecWithAudio(apiMessages, spec, assets, aiConfig);

      // If audio was generated, add it to project assets AND spec
      if (result.generatedAudio) {
        const { asset, blobUrl } = result.generatedAudio;
        addAsset(asset);
        setAssetBlobUrl(asset.id, blobUrl);
        toast.success(`Generated audio: ${asset.filename}`);

        // Add asset to spec.assets if spec was updated
        if (result.spec && !result.spec.assets.find(a => a.id === asset.id)) {
          result.spec.assets.push(asset);
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: result.displayText,
        specJson: !!result.spec,
        timestamp: Date.now(),
      };

      addMessage(assistantMessage);

      if (result.spec) {
        setSpec(result.spec);
      }
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'Chat request failed';
      addMessage({
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `Error: ${errorText}`,
        timestamp: Date.now(),
      });
      toast.error(errorText);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProviderChange = async (
    provider: AIProviderConfig['provider']
  ) => {
    const providerInfo = PROVIDERS[provider];
    const savedKey = (await loadAPIKey(provider)) || '';
    const newConfig: AIProviderConfig = {
      provider,
      apiKey: savedKey,
      model: providerInfo?.defaultModel || '',
    };
    setAiConfig(newConfig);
    saveSetting('ai-provider', provider);
    saveSetting('ai-model', newConfig.model || '');
  };

  const handleKeyChange = (apiKey: string) => {
    setAiConfig({ ...aiConfig, apiKey });
    if (apiKey) {
      saveAPIKey(aiConfig.provider, apiKey);
    }
  };

  const handleModelChange = (model: string) => {
    setAiConfig({ ...aiConfig, model });
    saveSetting('ai-model', model);
  };

  const providerModels = PROVIDERS[aiConfig.provider]?.models;
  const canSend = !!aiConfig.apiKey && !isGenerating && !!input.trim();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm">Chat</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setShowSettings(!showSettings)}
        >
          <SettingsIcon />
        </Button>
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="px-4 py-3 border-b space-y-3 bg-muted/50">
          <div className="space-y-1.5">
            <Label className="text-xs">Provider</Label>
            <Select
              value={aiConfig.provider}
              onValueChange={(v) =>
                handleProviderChange(v as AIProviderConfig['provider'])
              }
            >
              <SelectTrigger className="h-8 text-xs">
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

          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              className="h-8 text-xs"
              placeholder="Enter API key..."
              value={aiConfig.apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            {providerModels ? (
              <Select
                value={aiConfig.model || ''}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-8 text-xs"
                value={aiConfig.model || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                placeholder="e.g. gpt-4o"
              />
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {!aiConfig.apiKey && configLoaded && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
            No API key configured.{' '}
            <button
              className="underline"
              onClick={() => setShowSettings(true)}
            >
              Open settings
            </button>{' '}
            to add one.
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isGenerating && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiConfig.apiKey
                ? 'Describe changes to your video...'
                : 'Configure API key to start...'
            }
            disabled={!aiConfig.apiKey || isGenerating}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!canSend}
            className="self-end shrink-0"
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.specJson && (
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-600 dark:text-green-400">
            Video updated
          </span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-lg px-3 py-2 flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
