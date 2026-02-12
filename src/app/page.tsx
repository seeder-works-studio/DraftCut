'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptInput } from '@/components/home/prompt-input';
import { AssetUploader, AssetList } from '@/components/home/asset-uploader';
import {
  AIProviderSelector,
  type AIProviderConfig,
} from '@/components/home/ai-provider-selector';
import { BrandKitForm } from '@/components/home/brand-kit-form';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project-store';
import { generateVideoSpec } from '@/lib/claude/client';
import { exampleProjectSpec } from '@/lib/spec/example';
import type { BrandKit } from '@/lib/spec/types';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const { assets, isGenerating, setSpec, setIsGenerating } = useProjectStore();

  const [aiConfig, setAiConfig] = useState<AIProviderConfig>({
    provider: 'claude',
    apiKey: '',
    model: 'claude-sonnet-4-5-20250929',
  });

  const [brandKit, setBrandKit] = useState<BrandKit>({
    primaryFont: 'Inter',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
  });

  const handleGenerate = async (prompt: string) => {
    if (!aiConfig.apiKey) {
      toast.error('Please enter an API key');
      return;
    }

    setIsGenerating(true);
    try {
      const spec = await generateVideoSpec(prompt, assets, brandKit, aiConfig);
      setSpec(spec);
      toast.success('Video draft generated!');
      router.push('/editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadExample = () => {
    setSpec(exampleProjectSpec);
    toast.success('Example project loaded');
    router.push('/editor');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">DraftCut</h1>
          <p className="text-sm text-muted-foreground">
            AI Video Editor - Local & Private
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold">Create Videos with AI</h2>
          <p className="text-muted-foreground">
            Describe your video, upload assets, and let AI generate a complete
            video draft. Everything runs in your browser.
          </p>
        </div>

        <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />

        <AssetUploader />
        <AssetList />

        <div className="grid md:grid-cols-2 gap-4">
          <AIProviderSelector config={aiConfig} onChange={setAiConfig} />
          <BrandKitForm brandKit={brandKit} onChange={setBrandKit} />
        </div>

        <div className="text-center pt-4">
          <Button variant="ghost" size="sm" onClick={handleLoadExample}>
            Load Example Project
          </Button>
        </div>
      </main>
    </div>
  );
}
