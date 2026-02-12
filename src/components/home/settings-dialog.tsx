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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiConfig: AIProviderConfig;
  onAiConfigChange: (config: AIProviderConfig) => void;
  brandKit: BrandKit;
  onBrandKitChange: (brandKit: BrandKit) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
