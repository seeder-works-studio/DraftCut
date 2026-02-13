'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AIProviderSelector,
  type AIProviderConfig,
} from '@/components/home/ai-provider-selector';
import { BrandKitForm } from '@/components/home/brand-kit-form';
import { MediaServicesConfig } from '@/components/home/media-services-config';
import type { BrandKit } from '@/lib/spec/types';
import { Switch } from '@/components/ui/switch';

export interface AgenticModeConfig {
  enabled: boolean;
  targetScore: number;
  maxIterations: number;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiConfig: AIProviderConfig;
  onAiConfigChange: (config: AIProviderConfig) => void;
  brandKit: BrandKit;
  onBrandKitChange: (brandKit: BrandKit) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
  agenticMode: AgenticModeConfig;
  onAgenticModeChange: (config: AgenticModeConfig) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  aiConfig,
  onAiConfigChange,
  brandKit,
  onBrandKitChange,
  websiteUrl,
  onWebsiteUrlChange,
  agenticMode,
  onAgenticModeChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ai-provider">
          <TabsList variant="line">
            <TabsTrigger value="ai-provider">AI Provider</TabsTrigger>
            <TabsTrigger value="media-services">Media Services</TabsTrigger>
            <TabsTrigger value="brand-kit">Brand Kit</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-provider" className="pt-4">
            <AIProviderSelector config={aiConfig} onChange={onAiConfigChange} />
          </TabsContent>

          <TabsContent value="media-services" className="pt-4">
            <MediaServicesConfig />
          </TabsContent>

          <TabsContent value="brand-kit" className="pt-4">
            <BrandKitForm brandKit={brandKit} onChange={onBrandKitChange} />
          </TabsContent>

          <TabsContent value="website" className="pt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => onWebsiteUrlChange(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Provide a URL to auto-scrape images, text, and brand colors.
                Overridden if a URL is found in the prompt.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="pt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Agentic Video Creation</Label>
                    <p className="text-sm text-muted-foreground">
                      AI iteratively analyzes and improves video quality
                    </p>
                  </div>
                  <Switch
                    checked={agenticMode.enabled}
                    onCheckedChange={(enabled) =>
                      onAgenticModeChange({ ...agenticMode, enabled })
                    }
                  />
                </div>

                {agenticMode.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label>Target Quality Score</Label>
                      <Input
                        type="number"
                        min="70"
                        max="100"
                        value={agenticMode.targetScore}
                        onChange={(e) =>
                          onAgenticModeChange({
                            ...agenticMode,
                            targetScore: parseInt(e.target.value) || 85,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        AI will refine video until it reaches this score (70-100)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Iterations</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={agenticMode.maxIterations}
                        onChange={(e) =>
                          onAgenticModeChange({
                            ...agenticMode,
                            maxIterations: parseInt(e.target.value) || 5,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum refinement iterations (1-10)
                      </p>
                    </div>

                    <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                      <p className="font-medium">How it works:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>AI generates initial video from prompt</li>
                        <li>Analyzes quality (motion, pacing, composition)</li>
                        <li>Identifies issues and improvements</li>
                        <li>Refines video specification iteratively</li>
                        <li>Stops when target score reached</li>
                      </ol>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ Agentic mode takes longer but produces better results
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
