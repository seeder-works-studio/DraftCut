'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toolbar } from '@/components/editor/toolbar';
import { Preview } from '@/components/editor/preview';
import { Timeline } from '@/components/editor/timeline';
import { Inspector } from '@/components/editor/inspector';
import { ExportDialog } from '@/components/editor/export-dialog';
import { useProjectStore } from '@/stores/project-store';
import { useAutosave } from '@/hooks/use-autosave';
import { useAssetLoader } from '@/hooks/use-asset-loader';

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
        {/* Preview */}
        <div className="flex-1 min-w-0">
          <Preview />
        </div>

        {/* Inspector */}
        <div className="w-72 border-l overflow-y-auto bg-card">
          <Inspector />
        </div>
      </div>

      {/* Timeline */}
      <div className="h-48 border-t">
        <Timeline />
      </div>

      <ExportDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}
