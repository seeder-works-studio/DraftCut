'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromptInput } from '@/components/home/prompt-input';
import { AssetUploader, AssetList } from '@/components/home/asset-uploader';
import { SettingsDialog } from '@/components/home/settings-dialog';
import {
  GenerationProgressDialog,
  type GenerationStep,
} from '@/components/home/generation-progress-dialog';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import type { AgenticModeConfig } from '@/components/home/settings-dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/project-store';
import { generateVideoSpec } from '@/lib/claude/client';
import { exampleProjectSpec } from '@/lib/spec/example';
import type { BrandKit } from '@/lib/spec/types';
import { saveSetting, loadAPIKey } from '@/lib/storage/api-keys';
import { saveAsset, loadAsset } from '@/lib/storage/assets';
import { processWebsiteUrl } from '@/lib/ai/website';
import { generateMusic } from '@/lib/ai/music';
import { generateMusicBeatoven } from '@/lib/ai/beatoven';
import { analyzeVideoWithFrameSampling, type SmartVideoAnalysis } from '@/lib/ai/smart-video-analysis';
import type { VideoAnalysisSummary } from '@/lib/spec/types';
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

/**
 * Get most common subjects from frame analyses
 */
function getMostCommonSubjects(
  frames: Array<{ subjects: string[]; interestScore: number }>
): string[] {
  const subjectCounts = new Map<string, number>();

  for (const frame of frames) {
    for (const subject of frame.subjects) {
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
    }
  }

  return Array.from(subjectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
}

/**
 * Calculate average interest score for a clip
 */
function calculateClipScore(frames: Array<{ interestScore: number }>): number {
  if (frames.length === 0) return 5;
  return frames.reduce((sum, f) => sum + f.interestScore, 0) / frames.length;
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [agenticMode, setAgenticMode] = useState<AgenticModeConfig>({
    enabled: false,
    targetScore: 85,
    maxIterations: 5,
  });

  const [progressOpen, setProgressOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<GenerationStep[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>();

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

  // Helper to update progress step status
  const updateStepStatus = (
    stepId: string,
    status: GenerationStep['status'],
    error?: string
  ) => {
    setProgressSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status, error } : s))
    );
    if (status === 'in-progress') {
      setCurrentStepId(stepId);
    }
  };

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

    // Check which videos need analysis (not yet analyzed)
    const videosNeedingAnalysis = assets.filter(
      (a) => a.type === 'video' && !a.videoAnalysis?.analyzed
    );

    // Detect URL for website scraping
    const detectedUrl = extractUrl(prompt) || websiteUrl.trim() || null;

    // Check music services
    const beatovenKey = await loadAPIKey('beatoven');
    const replicateKey = await loadAPIKey('replicate');

    // Initialize progress steps
    const initialSteps: GenerationStep[] = [
      ...(videosNeedingAnalysis.length > 0
        ? [
            {
              id: 'video-analysis',
              label: 'Analyzing Videos',
              description: `Finding best moments in ${videosNeedingAnalysis.length} video${videosNeedingAnalysis.length > 1 ? 's' : ''}`,
              status: 'pending' as const,
            },
          ]
        : []),
      ...(detectedUrl
        ? [
            {
              id: 'website-scrape',
              label: 'Scraping Website',
              description: 'Extracting brand colors and images',
              status: 'pending' as const,
            },
            {
              id: 'save-images',
              label: 'Saving Assets',
              description: 'Storing website images',
              status: 'pending' as const,
            },
          ]
        : []),
      ...(beatovenKey || replicateKey
        ? [
            {
              id: 'music-generation',
              label: 'Generating Music',
              description: 'Creating background music with AI',
              status: 'pending' as const,
            },
          ]
        : []),
      {
        id: 'video-spec',
        label: 'Generating Video',
        description: 'AI is creating your video structure',
        status: 'pending' as const,
      },
    ];

    setProgressSteps(initialSteps);
    setProgressOpen(true);
    setIsGenerating(true);

    try {
      let websiteContext: { title: string; textContent: string; url: string } | undefined;
      let currentBrandKit = { ...brandKit };

      // Step 1: Analyze videos (runs during generation, not on upload)
      if (videosNeedingAnalysis.length > 0) {
        logger.info('HomePage', 'Starting video analysis', {
          count: videosNeedingAnalysis.length,
        });
        updateStepStatus('video-analysis', 'in-progress');

        // Check if Gemini API key is available
        const geminiKey = await loadAPIKey('gemini-video');
        if (!geminiKey) {
          logger.warn('HomePage', 'No Gemini API key - skipping video analysis');
          updateStepStatus('video-analysis', 'skipped');
          toast.warning('Video analysis skipped - no Gemini API key configured');
        } else {
          // Analyze all videos in parallel
          const analysisPromises = videosNeedingAnalysis.map(async (asset) => {
            try {
              // Load video file from IndexedDB
              const result = await loadAsset(asset.id);
              if (!result) {
                logger.error('HomePage', 'Asset not found in IndexedDB', { assetId: asset.id });
                return;
              }

              // Analyze video
              const analysis: SmartVideoAnalysis = await analyzeVideoWithFrameSampling(
                result.blob as File,
                geminiKey,
                {
                  maxFrames: 10,
                  minSceneLength: 10,
                  purpose: 'highlights',
                }
              );

              // Convert to summary format
              const summary: VideoAnalysisSummary = {
                analyzed: true,
                analyzedAt: new Date().toISOString(),
                totalScenes: analysis.totalScenes,
                bestMomentsCount: analysis.bestMoments.length,
                suggestedClipsCount: analysis.suggestedClips.length,
                overallTone: analysis.overallTone,
                topSubjects: getMostCommonSubjects(analysis.frames),
                suggestedClips: analysis.suggestedClips.map((clip) => ({
                  startTime: clip.startTime,
                  endTime: clip.endTime,
                  reason: clip.reason,
                  interestScore: calculateClipScore(
                    analysis.frames.filter(
                      (f) => f.timestamp >= clip.startTime && f.timestamp <= clip.endTime
                    )
                  ),
                })),
                bestMoments: analysis.bestMoments,
              };

              // Update asset with analysis
              useProjectStore.getState().updateAsset(asset.id, { videoAnalysis: summary });

              logger.info('HomePage', 'Video analyzed successfully', {
                assetId: asset.id,
                bestMoments: analysis.bestMoments.length,
                suggestedClips: analysis.suggestedClips.length,
              });
            } catch (error) {
              logger.error('HomePage', 'Video analysis failed', { assetId: asset.id, error });
            }
          });

          await Promise.all(analysisPromises);
          logger.info('HomePage', 'All videos analyzed');
          updateStepStatus('video-analysis', 'completed');
        }
      }

      // Step 2: Website scraping
      if (detectedUrl) {
        const targetUrl = detectedUrl;
        logger.info('HomePage', 'Starting website scrape', { url: targetUrl });
        updateStepStatus('website-scrape', 'in-progress');

        try {
          const websiteData = await processWebsiteUrl(targetUrl);
          logger.info('HomePage', 'Website scraped successfully', {
            title: websiteData.title,
            imageCount: websiteData.images.length,
            colorCount: websiteData.colors.length,
          });
          updateStepStatus('website-scrape', 'completed');

          websiteContext = {
            title: websiteData.title,
            textContent: websiteData.textContent,
            url: websiteData.url,
          };

          // Store scraped images as assets
          if (websiteData.images.length > 0) {
            logger.info('HomePage', 'Saving website images', {
              count: websiteData.images.length,
            });
            updateStepStatus('save-images', 'in-progress');

            for (const imageFile of websiteData.images) {
              const asset = await saveAsset(imageFile);
              addAsset(asset);
              // Create blob URL for immediate use (same as manual upload)
              const blobUrl = URL.createObjectURL(imageFile);
              setAssetBlobUrl(asset.id, blobUrl);
              logger.debug('HomePage', 'Image asset saved with blob URL', { assetId: asset.id });
            }

            updateStepStatus('save-images', 'completed');
          } else {
            updateStepStatus('save-images', 'skipped');
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
          updateStepStatus('website-scrape', 'error', msg);
          updateStepStatus('save-images', 'skipped');
          toast.warning(`Could not scrape website: ${msg}`);
        }
      }

      // Step 3: Music generation
      if (beatovenKey || replicateKey) {
        logger.info('HomePage', 'Starting music generation');
        updateStepStatus('music-generation', 'in-progress');

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
          updateStepStatus('music-generation', 'completed');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Music generation failed';
          logger.error('HomePage', 'Music generation error', { error: msg });
          updateStepStatus('music-generation', 'error', msg);
          toast.warning(`Could not generate music: ${msg}`);
        }
      }

      // Step 4: Generate video spec with all enriched context
      logger.info('HomePage', 'Starting video spec generation');
      updateStepStatus('video-spec', 'in-progress');
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
        agenticMode
      );

      logger.info('HomePage', 'Video spec generated successfully');
      updateStepStatus('video-spec', 'completed');

      setSpec(spec);
      saveSetting('ai-provider', aiConfig.provider);
      saveSetting('ai-model', aiConfig.model || '');

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success('Video draft generated!');
      logger.info('HomePage', 'Navigating to editor');
      setProgressOpen(false);
      router.push('/editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      logger.error('HomePage', 'Generation error', { error: message, stack: (err as Error).stack });

      // Mark current step as error
      if (currentStepId) {
        updateStepStatus(currentStepId, 'error', message);
      }

      toast.error(message);

      // Keep dialog open for 3 seconds to show error, then close
      setTimeout(() => {
        setProgressOpen(false);
      }, 3000);
    } finally {
      logger.info('HomePage', 'Generation completed');
      setIsGenerating(false);
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

      <GenerationProgressDialog
        open={progressOpen}
        steps={progressSteps}
        currentStep={currentStepId}
      />
    </div>
  );
}
