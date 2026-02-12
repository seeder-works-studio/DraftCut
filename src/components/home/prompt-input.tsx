'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  statusMessage?: string;
  onSettingsClick: () => void;
}

export function PromptInput({ onGenerate, isGenerating, statusMessage, onSettingsClick }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt.trim());
  };

  return (
    <Card className="p-4 space-y-3">
      <Textarea
        placeholder="e.g. Create a 20s promo for gruns.com with intro, captions, and CTA..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="resize-none"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onSettingsClick} title="Settings">
          <Settings className="size-5" />
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (statusMessage || 'Generating...') : 'Generate Video Draft'}
        </Button>
      </div>
    </Card>
  );
}
