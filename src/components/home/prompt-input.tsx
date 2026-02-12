'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export function PromptInput({ onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt.trim());
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Describe Your Video</h2>
      <Textarea
        placeholder="e.g. Make a 20s promo video with an intro title, captions, and a call-to-action outro..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Video Draft'}
        </Button>
      </div>
    </Card>
  );
}
