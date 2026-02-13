'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromptInput } from '@/components/home/prompt-input';
import { AssetUploader, AssetList } from '@/components/home/asset-uploader';
import { SettingsDialog } from '@/components/home/settings-dialog';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import type { AgenticModeConfig } from '@/components/home/settings-dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project-store';
import { generateVideoSpec } from '@/lib/claude/client';
import { exampleProjectSpec } from '@/lib/spec/example';
import type { BrandKit } from '@/lib/spec/types';
import { saveSetting, loadAPIKey } from '@/lib/storage/api-keys';
import { saveAsset } from '@/lib/storage/assets';
import { processWebsiteUrl } from '@/lib/ai/website';
import { generateMusic } from '@/lib/ai/music';
import { generateMusicBeatoven } from '@/lib/ai/beatoven';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

function extractUrl(text: string): string | null {
  // Match full URLs first
  const fullUrl = text.match(/https?:\/\/[^\s]+/i);
  if (fullUrl) return fullUrl[0];

  // Match bare domains (e.g. "gruns.com", "example.co.uk/page")
  // But exclude common file extensions
  const bareDomain = text.match(/(?:^|\s)((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)/);
  if (bareDomain) {
    const domain = bareDomain[1];
    // Skip if it looks like a filename (ends with common image/video/audio extensions)
    if (/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|mp3|wav|m4a)$/i.test(domain)) {
      return null;
    }
    return `https://${domain}`;
  }
  return null;
}

export default function HomePage() {
  const router = useRouter();
  const { assets, isGenerating, setSpec, setIsGenerating, addAsset, setAssetBlobUrl } =
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

  const [agenticMode, setAgenticMode] = useState<AgenticModeConfig>({
    enabled: false,
    targetScore: 85,
    maxIterations: 5,
  });

  // Load API key from IndexedDB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedProvider = (await loadAPIKey('ai-provider')) as string | undefined;
        const savedModel = (await loadAPIKey('ai-model')) as string | undefined;

        // Try to load API key for the saved provider, or fall back to claude
        const provider = savedProvider || 'claude';
        const apiKey = await loadAPIKey(provider);

        if (apiKey) {
          logger.info('HomePage', 'Loaded API key from storage', { provider });
          setAiConfig({
            provider: provider as any,
            apiKey,
            model: savedModel || (provider === 'claude' ? 'claude-sonnet-4-5-20250929' : 'gemini-2.5-flash'),
          });
        }
      } catch (err) {
        logger.warn('HomePage', 'Failed to load settings from storage', err);
      }
    };

    loadSettings();
  }, []);

  const handleGenerate = async (prompt: string) => {
    logger.info('HomePage', 'Generation requested', {
      promptLength: prompt.length,
      provider: aiConfig.provider,
      assetCount: assets.length,
    });

    if (!aiConfig.apiKey) {
      logger.warn('HomePage', 'Generation attempted without API key');
      toast.error('Please enter an API key in Settings');
      return;
    }

    setIsGenerating(true);
    try {
      let websiteContext: { title: string; textContent: string; url: string } | undefined;
      let currentBrandKit = { ...brandKit };

      // Step 1: Detect URLs in prompt, fall back to settings URL
      const detectedUrl = extractUrl(prompt) || websiteUrl.trim() || null;
      logger.debug('HomePage', 'URL detection', {
        detectedUrl,
        hasWebsiteUrl: !!websiteUrl.trim(),
      });

      if (detectedUrl) {
        const targetUrl = detectedUrl;
        logger.info('HomePage', 'Starting website scrape', { url: targetUrl });
        setStatusMessage('Scraping website...');
        try {
          const websiteData = await processWebsiteUrl(targetUrl);
          logger.info('HomePage', 'Website scraped successfully', {
            title: websiteData.title,
            imageCount: websiteData.images.length,
            colorCount: websiteData.colors.length,
          });

          websiteContext = {
            title: websiteData.title,
            textContent: websiteData.textContent,
            url: websiteData.url,
          };

          // Step 2: Store scraped images as assets
          if (websiteData.images.length > 0) {
            logger.info('HomePage', 'Saving website images', {
              count: websiteData.images.length,
            });
            setStatusMessage('Saving website images...');
            for (const imageFile of websiteData.images) {
              const asset = await saveAsset(imageFile);
              addAsset(asset);
              // Create blob URL for immediate use (same as manual upload)
              const blobUrl = URL.createObjectURL(imageFile);
              setAssetBlobUrl(asset.id, blobUrl);
              logger.debug('HomePage', 'Image asset saved with blob URL', { assetId: asset.id });
            }
          }

          // Step 3: Apply brand colors
          if (websiteData.colors.length > 0) {
            logger.info('HomePage', 'Applying brand colors', {
              colors: websiteData.colors,
            });
            currentBrandKit = {
              ...currentBrandKit,
              primaryColor: websiteData.colors[0],
              secondaryColor: websiteData.colors[1] || currentBrandKit.secondaryColor,
            };
            setBrandKit(currentBrandKit);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Website scrape failed';
          logger.warn('HomePage', 'Website scrape error', { error: msg });
          toast.warning(`Could not scrape website: ${msg}`);
        }
      }

      // Step 4: Music generation (Beatoven first, fall back to Replicate)
      const beatovenKey = await loadAPIKey('beatoven');
      const replicateKey = await loadAPIKey('replicate');
      logger.debug('HomePage', 'Music service availability', {
        hasBeatoven: !!beatovenKey,
        hasReplicate: !!replicateKey,
      });

      if (beatovenKey || replicateKey) {
        logger.info('HomePage', 'Starting music generation');
        setStatusMessage('Generating music...');
        try {
          const musicPrompt = websiteContext
            ? `upbeat background music for a promo video about ${websiteContext.title}`
            : 'upbeat energetic background music for a short promo video';
          let audioBlob: Blob;
          let filename: string;
          let mimeType: string;

          if (beatovenKey) {
            logger.info('HomePage', 'Using Beatoven for music generation');
            audioBlob = await generateMusicBeatoven(musicPrompt, beatovenKey);
            filename = 'generated-music.mp3';
            mimeType = 'audio/mpeg';
          } else {
            logger.info('HomePage', 'Using Replicate for music generation');
            audioBlob = await generateMusic(musicPrompt, 20, replicateKey!);
            filename = 'generated-music.wav';
            mimeType = 'audio/wav';
          }

          logger.info('HomePage', 'Music generated successfully', {
            filename,
            size: audioBlob.size,
          });

          const audioFile = new File([audioBlob], filename, { type: mimeType });
          const audioAsset = await saveAsset(audioFile);
          addAsset(audioAsset);
          // Create blob URL for immediate use (same as manual upload)
          const audioBlobUrl = URL.createObjectURL(audioFile);
          setAssetBlobUrl(audioAsset.id, audioBlobUrl);
          logger.debug('HomePage', 'Audio asset saved with blob URL', { assetId: audioAsset.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Music generation failed';
          logger.error('HomePage', 'Music generation error', { error: msg });
          toast.warning(`Could not generate music: ${msg}`);
        }
      }

      // Step 5: Generate video spec with all enriched context
      logger.info('HomePage', 'Starting video spec generation');
      setStatusMessage('Generating video spec...');
      const allAssets = useProjectStore.getState().assets;
      logger.debug('HomePage', 'Assets before video generation', {
        count: allAssets.length,
        types: allAssets.map((a) => a.type),
      });

      const spec = await generateVideoSpec(
        prompt,
        allAssets,
        currentBrandKit,
        aiConfig,
        websiteContext,
        agenticMode,
        setStatusMessage
      );

      logger.info('HomePage', 'Video spec generated successfully');
      setSpec(spec);
      saveSetting('ai-provider', aiConfig.provider);
      saveSetting('ai-model', aiConfig.model || '');
      toast.success('Video draft generated!');
      logger.info('HomePage', 'Navigating to editor');
      router.push('/editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      logger.error('HomePage', 'Generation error', { error: message, stack: (err as Error).stack });
      toast.error(message);
    } finally {
      logger.info('HomePage', 'Generation completed');
      setIsGenerating(false);
      setStatusMessage(undefined);
    }
  };

  const handleLoadExample = () => {
    logger.info('HomePage', 'Loading example project');
    setSpec(exampleProjectSpec);
    toast.success('Example project loaded');
    logger.info('HomePage', 'Navigating to editor with example project');
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
        agenticMode={agenticMode}
        onAgenticModeChange={setAgenticMode}
      />
    </div>
  );
}
