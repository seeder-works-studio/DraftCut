'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Toolbar } from '@/components/editor/toolbar';
import { Preview } from '@/components/editor/preview';
import { Timeline } from '@/components/editor/timeline';
import { ChatPanel } from '@/components/editor/chat-panel';
import { useProjectStore } from '@/stores/project-store';
import { useAutosave } from '@/hooks/use-autosave';
import { useAssetLoader } from '@/hooks/use-asset-loader';

// Lazy load export dialog to avoid SSR issues with Diffusion Studios
const ExportDialog = dynamic(
  () => import('@/components/editor/export-dialog').then(mod => ({ default: mod.ExportDialog })),
  { ssr: false }
);

export default function EditorPage() {
  const router = useRouter();
  const spec = useProjectStore((s) => s.spec);
  const [showExport, setShowExport] = useState(false);

  useAutosave(spec);
  useAssetLoader();

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No project loaded</p>
          <button
            className="text-primary underline"
            onClick={() => router.push('/')}
          >
            Go back to create one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toolbar
        onExport={() => setShowExport(true)}
        onBack={() => router.push('/')}
      />

      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div className="w-[400px] border-r shrink-0">
          <ChatPanel />
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview */}
          <div className="flex-1 min-h-0">
            <Preview />
          </div>

          {/* Timeline */}
          <div className="h-48 border-t">
            <Timeline />
          </div>
        </div>
      </div>

      <ExportDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}
