/**
 * Automatic video analysis hook
 * Analyzes videos when uploaded and stores results with asset
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { analyzeVideoWithFrameSampling, type SmartVideoAnalysis } from '@/lib/ai/smart-video-analysis';
import { loadAPIKey } from '@/lib/storage/api-keys';
import { useProjectStore } from '@/stores/project-store';
import type { VideoAnalysisSummary } from '@/lib/spec/types';

export function useAutoVideoAnalysis() {
  const updateAsset = useProjectStore((s) => s.updateAsset);

  const analyzeVideo = useCallback(
    async (file: File, assetId: string) => {
      // Check if Gemini API key is available
      const geminiKey = await loadAPIKey('gemini-video');
      if (!geminiKey) {
        console.log('No Gemini API key - skipping video analysis');
        return;
      }

      try {
        // Show toast that analysis is starting
        const toastId = toast.loading(`Analyzing ${file.name}...`, {
          description: 'Finding best moments in your video',
        });

        // Run analysis
        const analysis: SmartVideoAnalysis = await analyzeVideoWithFrameSampling(
          file,
          geminiKey,
          {
            maxFramesPerMinute: 1,
            minSceneLength: 5,
            purpose: 'highlights', // Always look for highlights
          }
        );

        // Convert to summary format for asset
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
        updateAsset(assetId, { videoAnalysis: summary });

        // Success toast
        toast.success('Video analyzed!', {
          id: toastId,
          description: `Found ${analysis.bestMoments.length} great moments, ${analysis.suggestedClips.length} clips suggested`,
        });
      } catch (error) {
        console.error('Video analysis failed:', error);
        toast.error('Video analysis failed', {
          description: 'Video will still be available for use',
        });
      }
    },
    [updateAsset]
  );

  return { analyzeVideo };
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
