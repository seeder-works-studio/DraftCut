import { create } from 'zustand';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import { logger } from '@/lib/logger';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  specJson?: boolean;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  aiConfig: AIProviderConfig;

  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setIsGenerating: (generating: boolean) => void;
  setAiConfig: (config: AIProviderConfig) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isGenerating: false,
  aiConfig: {
    provider: 'claude',
    apiKey: '',
    model: 'claude-sonnet-4-5-20250929',
  },

  addMessage: (message) => {
    logger.debug('ChatStore', 'Adding chat message', {
      role: message.role,
      contentLength: message.content.length,
      specJson: message.specJson,
    });
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearMessages: () => {
    logger.info('ChatStore', 'Clearing all chat messages');
    set({ messages: [] });
  },

  setIsGenerating: (isGenerating) => {
    logger.info('ChatStore', `Chat generation ${isGenerating ? 'started' : 'completed'}`);
    set({ isGenerating });
  },

  setAiConfig: (aiConfig) => {
    logger.info('ChatStore', 'Setting AI configuration', {
      provider: aiConfig.provider,
      model: aiConfig.model,
    });
    set({ aiConfig });
  },
}));
