'use client';

import { useEffect } from 'react';
import { saveProject } from '@/lib/storage/projects';
import type { ProjectSpec } from '@/lib/spec/types';
import { toast } from 'sonner';

export function useAutosave(spec: ProjectSpec | null, interval = 30000) {
  useEffect(() => {
    if (!spec) return;

    const timer = setInterval(async () => {
      try {
        await saveProject(spec);
        toast.success('Project autosaved', { duration: 2000 });
      } catch {
        toast.error('Autosave failed');
      }
    }, interval);

    return () => clearInterval(timer);
  }, [spec, interval]);
}
