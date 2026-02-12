'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptInput } from '@/components/home/prompt-input';
import { AssetUploader, AssetList } from '@/components/home/asset-uploader';
import { SettingsDialog } from '@/components/home/settings-dialog';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project-store';
import { generateVideoSpec } from '@/lib/claude/client';
import { exampleProjectSpec } from '@/lib/spec/example';
import type { BrandKit } from '@/lib/spec/types';
import { saveSetting, loadAPIKey } from '@/lib/storage/api-keys';
import { saveAsset } from '@/lib/storage/assets';
import { processWebsiteUrl } from '@/lib/ai/website';
import { generateMusic } from '@/lib/ai/music';
import { toast } from 'sonner';

function extractUrl(text: string): string | null {
  // Match full URLs first
  const fullUrl = text.match(/https?:\/\/[^\s]+/i);
  if (fullUrl) return fullUrl[0];
  // Match bare domains (e.g. "gruns.com", "example.co.uk/page")
  const bareDomain = text.match(/(?:^|\s)((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/);
  if (bareDomain) return `https://${bareDomain[1]}`;
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const { assets, isGenerating, setSpec, setIsGenerating, addAsset } =
    useProjectStore();

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

  const [statusMessage, setStatusMessage] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const handleGenerate = async (prompt: string) => {
    if (!aiConfig.apiKey) {
      toast.error('Please enter an API key in Settings');
      return;
    }

    setIsGenerating(true);
    try {
      let websiteContext: { title: string; textContent: string; url: string } | undefined;
      let currentBrandKit = { ...brandKit };

      // Step 1: Detect URLs in prompt, fall back to settings URL
      const detectedUrl = extractUrl(prompt) || websiteUrl.trim() || null;
      if (detectedUrl) {
        const targetUrl = detectedUrl;
        setStatusMessage('Scraping website...');
        try {
          const websiteData = await processWebsiteUrl(targetUrl);

          websiteContext = {
            title: websiteData.title,
            textContent: websiteData.textContent,
            url: websiteData.url,
          };

          // Step 2: Store scraped images as assets
          if (websiteData.images.length > 0) {
            setStatusMessage('Saving website images...');
            for (const imageFile of websiteData.images) {
              const asset = await saveAsset(imageFile);
              addAsset(asset);
            }
          }

          // Step 3: Apply brand colors
          if (websiteData.colors.length > 0) {
            currentBrandKit = {
              ...currentBrandKit,
              primaryColor: websiteData.colors[0],
              secondaryColor: websiteData.colors[1] || currentBrandKit.secondaryColor,
            };
            setBrandKit(currentBrandKit);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Website scrape failed';
          toast.warning(`Could not scrape website: ${msg}`);
        }
      }

      // Step 4: Music generation (if Replicate key is configured)
      const replicateKey = await loadAPIKey('replicate');
      if (replicateKey) {
        setStatusMessage('Generating music...');
        try {
          const musicPrompt = websiteContext
            ? `upbeat background music for a promo video about ${websiteContext.title}`
            : 'upbeat energetic background music for a short promo video';
          const audioBlob = await generateMusic(musicPrompt, 20, replicateKey);
          const audioFile = new File([audioBlob], 'generated-music.wav', {
            type: 'audio/wav',
          });
          const audioAsset = await saveAsset(audioFile);
          addAsset(audioAsset);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Music generation failed';
          toast.warning(`Could not generate music: ${msg}`);
        }
      }

      // Step 5: Generate video spec with all enriched context
      setStatusMessage('Generating video spec...');
      const allAssets = useProjectStore.getState().assets;
      const spec = await generateVideoSpec(
        prompt,
        allAssets,
        currentBrandKit,
        aiConfig,
        websiteContext
      );
      setSpec(spec);
      saveSetting('ai-provider', aiConfig.provider);
      saveSetting('ai-model', aiConfig.model || '');
      toast.success('Video draft generated!');
      router.push('/editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setStatusMessage(undefined);
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

        <PromptInput
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <AssetUploader />
        <AssetList />

        <div className="text-center pt-4">
          <Button variant="ghost" size="sm" onClick={handleLoadExample}>
            Load Example Project
          </Button>
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        aiConfig={aiConfig}
        onAiConfigChange={setAiConfig}
        brandKit={brandKit}
        onBrandKitChange={setBrandKit}
        websiteUrl={websiteUrl}
        onWebsiteUrlChange={setWebsiteUrl}
      />
    </div>
  );
}
