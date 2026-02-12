import { create } from 'zustand';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';

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

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  clearMessages: () => set({ messages: [] }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setAiConfig: (aiConfig) => set({ aiConfig }),
}));
