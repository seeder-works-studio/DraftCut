'use client';

import { useEffect, useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { saveAPIKey, loadAPIKey } from '@/lib/storage/api-keys';

interface MediaService {
  id: string;
  name: string;
  letter: string;
  description: string;
  placeholder: string;
  signupUrl: string;
}

export const MEDIA_SERVICES: MediaService[] = [
  {
    id: 'gemini-video',
    name: 'Gemini Video',
    letter: 'G',
    description: 'AI video content analysis',
    placeholder: 'AIza...',
    signupUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    letter: 'E',
    description: 'Voice & sound effects',
    placeholder: 'xi_...',
    signupUrl: 'https://elevenlabs.io/app/settings/api-keys',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    letter: 'R',
    description: 'AI image & video models',
    placeholder: 'r8_...',
    signupUrl: 'https://replicate.com/account/api-tokens',
  },
  {
    id: 'fal',
    name: 'FAL.ai',
    letter: 'F',
    description: 'NanaBanana image generation',
    placeholder: 'fal_...',
    signupUrl: 'https://fal.ai/dashboard/keys',
  },
  {
    id: 'pexels',
    name: 'Pexels',
    letter: 'P',
    description: 'Stock video & photos',
    placeholder: 'Enter Pexels API key...',
    signupUrl: 'https://www.pexels.com/api/new/',
  },
  {
    id: 'beatoven',
    name: 'Beatoven.ai',
    letter: 'B',
    description: 'AI music composition',
    placeholder: 'Enter Beatoven API key...',
    signupUrl: 'https://www.beatoven.ai/pricing',
  },
];

export function MediaServicesConfig() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    Promise.all(
      MEDIA_SERVICES.map(async (s) => {
        const key = await loadAPIKey(s.id);
        return [s.id, key || ''] as const;
      })
    ).then((entries) => {
      setKeys(Object.fromEntries(entries));
      setLoaded(true);
    });
  }, [loaded]);

  const handleKeyChange = (serviceId: string, value: string) => {
    setKeys((prev) => ({ ...prev, [serviceId]: value }));
    saveAPIKey(serviceId, value);
  };

  return (
    <div className="space-y-3">
      {MEDIA_SERVICES.map((service) => (
        <div key={service.id} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
            {service.letter}
          </div>
          <div className="min-w-[120px] shrink-0">
            <div className="flex items-center gap-1 text-sm font-medium leading-tight">
              {service.name}
              <span title={service.description}><Info className="size-3.5 text-muted-foreground" /></span>
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {service.description}
            </div>
          </div>
          <Input
            type="password"
            className="flex-1"
            placeholder={service.placeholder}
            value={keys[service.id] || ''}
            onChange={(e) => handleKeyChange(service.id, e.target.value)}
          />
          <a
            href={service.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" type="button" tabIndex={-1}>
              Get Key <ExternalLink className="size-3.5 ml-1" />
            </Button>
          </a>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">
        Stored locally in your browser. Never sent to any server.
      </p>
    </div>
  );
}
