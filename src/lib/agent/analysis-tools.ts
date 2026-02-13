/**
 * Analysis tools for agentic video quality assessment
 * These tools help AI analyze generated videos and suggest improvements
 */

import type { ProjectSpec, Clip, Track } from '@/lib/spec/types';

export interface AnalysisResult {
  issues: Issue[];
  score: number; // 0-100
  suggestions: string[];
}

export interface Issue {
  severity: 'low' | 'medium' | 'high';
  type: 'static' | 'pacing' | 'motion' | 'composition' | 'timing';
  description: string;
  affectedClips?: string[]; // Clip IDs
  suggestion: string;
}

/**
 * Analyze entire video spec for quality issues
 */
export function analyzeVideoQuality(spec: ProjectSpec): AnalysisResult {
  const issues: Issue[] = [];

  // Check for static content
  issues.push(...checkStaticContent(spec));

  // Check pacing
  issues.push(...checkPacing(spec));

  // Check motion graphics usage
  issues.push(...checkMotionGraphics(spec));

  // Check composition
  issues.push(...checkComposition(spec));

  // Check timing
  issues.push(...checkTiming(spec));

  // Calculate score (100 - 5 points per high, 3 per medium, 1 per low)
  const score = Math.max(
    0,
    100 -
      issues.filter((i) => i.severity === 'high').length * 5 -
      issues.filter((i) => i.severity === 'medium').length * 3 -
      issues.filter((i) => i.severity === 'low').length * 1
  );

  // Generate suggestions
  const suggestions = generateSuggestions(issues, spec);

  return { issues, score, suggestions };
}

/**
 * Check for static image clips (should use ImageSlideshow instead)
 */
function checkStaticContent(spec: ProjectSpec): Issue[] {
  const issues: Issue[] = [];

  for (const track of spec.composition.tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'image') {
        issues.push({
          severity: 'high',
          type: 'static',
          description: `Image clip "${clip.assetId}" has no motion`,
          affectedClips: [clip.id],
          suggestion:
            'Convert to ImageSlideshow skill with Ken Burns effects (zoomIn, zoomOut, panLeft, panRight)',
        });
      }
    }
  }

  return issues;
}

/**
 * Check pacing (clips too long/short, no variation)
 */
function checkPacing(spec: ProjectSpec): Issue[] {
  const issues: Issue[] = [];
  const clips = spec.composition.tracks.flatMap((t) => t.clips);

  // Check for clips that are too long
  const longClips = clips.filter((c) => c.duration > 10);
  if (longClips.length > 0) {
    issues.push({
      severity: 'medium',
      type: 'pacing',
      description: `${longClips.length} clips longer than 10 seconds`,
      affectedClips: longClips.map((c) => c.id),
      suggestion:
        'Consider splitting long clips or adding overlay animations to maintain interest',
    });
  }

  // Check for clips that are too short
  const shortClips = clips.filter((c) => c.duration < 2 && c.type !== 'skill');
  if (shortClips.length > 0) {
    issues.push({
      severity: 'low',
      type: 'pacing',
      description: `${shortClips.length} clips shorter than 2 seconds`,
      affectedClips: shortClips.map((c) => c.id),
      suggestion:
        'Very short clips can feel rushed - consider extending to 2-3 seconds',
    });
  }

  // Check for monotonous pacing (all clips similar duration)
  const durations = clips.map((c) => c.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance =
    durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
    durations.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 1.0 && clips.length > 3) {
    issues.push({
      severity: 'medium',
      type: 'pacing',
      description: 'All clips have similar duration - pacing feels monotonous',
      suggestion:
        'Vary clip durations for dynamic pacing (mix 3-5s clips with 6-10s clips)',
    });
  }

  return issues;
}

/**
 * Check for use of motion graphics and animations
 */
function checkMotionGraphics(spec: ProjectSpec): Issue[] {
  const issues: Issue[] = [];
  const clips = spec.composition.tracks.flatMap((t) => t.clips);

  // Check for ImageSlideshow without Ken Burns
  const slideshowClips = clips.filter(
    (c) => c.type === 'skill' && c.skillType === 'ImageSlideshow'
  );
  for (const clip of slideshowClips) {
    const props = clip.skillProps as any;
    const slides = props?.slides || [];
    const staticSlides = slides.filter(
      (s: any) => !s.kenBurns || s.kenBurns === 'none'
    );

    if (staticSlides.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'motion',
        description: `ImageSlideshow has ${staticSlides.length} static slides without Ken Burns effects`,
        affectedClips: [clip.id],
        suggestion:
          'Add Ken Burns effects (zoomIn, zoomOut, panLeft, panRight) to all slides',
      });
    }
  }

  // Check for missing intro/outro
  const hasIntro = clips.some((c) => c.skillType === 'IntroTitleCard');
  const hasOutro = clips.some((c) => c.skillType === 'OutroCTA');

  if (!hasIntro && spec.canvas.duration > 15) {
    issues.push({
      severity: 'low',
      type: 'composition',
      description: 'Video lacks professional intro title card',
      suggestion:
        'Add IntroTitleCard skill at start with title, subtitle, and logo',
    });
  }

  if (!hasOutro && spec.canvas.duration > 20) {
    issues.push({
      severity: 'low',
      type: 'composition',
      description: 'Video lacks call-to-action outro',
      suggestion:
        'Add OutroCTA skill at end with message, button, and contact info',
    });
  }

  // Check for overlay skills (captions, lower thirds)
  const hasOverlays = clips.some(
    (c) =>
      c.skillType === 'LowerThird' ||
      c.skillType === 'CaptionsPop' ||
      c.skillType === 'TextReveal'
  );

  if (!hasOverlays && clips.length > 5) {
    issues.push({
      severity: 'low',
      type: 'motion',
      description: 'Video could benefit from text overlays or captions',
      suggestion:
        'Add LowerThird, CaptionsPop, or TextReveal skills to highlight key points',
    });
  }

  return issues;
}

/**
 * Check composition (layer order, overlapping clips)
 */
function checkComposition(spec: ProjectSpec): Issue[] {
  const issues: Issue[] = [];

  // Check for overlapping clips on same track
  for (const track of spec.composition.tracks) {
    for (let i = 0; i < track.clips.length - 1; i++) {
      const clip = track.clips[i];
      const nextClip = track.clips[i + 1];

      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > nextClip.startTime) {
        issues.push({
          severity: 'high',
          type: 'composition',
          description: `Clips overlap on ${track.type} track`,
          affectedClips: [clip.id, nextClip.id],
          suggestion:
            'Adjust clip timing to prevent overlap or move to separate track',
        });
      }
    }
  }

  // Check for gaps in timeline
  const videoTrack = spec.composition.tracks.find((t) => t.type === 'video');
  if (videoTrack) {
    const sortedClips = [...videoTrack.clips].sort(
      (a, b) => a.startTime - b.startTime
    );

    for (let i = 0; i < sortedClips.length - 1; i++) {
      const clip = sortedClips[i];
      const nextClip = sortedClips[i + 1];

      const clipEnd = clip.startTime + clip.duration;
      const gap = nextClip.startTime - clipEnd;

      if (gap > 0.5) {
        issues.push({
          severity: 'medium',
          type: 'composition',
          description: `${gap.toFixed(1)}s gap in video track`,
          affectedClips: [clip.id, nextClip.id],
          suggestion: 'Add transition clip or extend previous clip to fill gap',
        });
      }
    }
  }

  return issues;
}

/**
 * Check timing and synchronization
 */
function checkTiming(spec: ProjectSpec): Issue[] {
  const issues: Issue[] = [];

  // Check if clips extend beyond canvas duration
  for (const track of spec.composition.tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > spec.canvas.duration) {
        issues.push({
          severity: 'high',
          type: 'timing',
          description: `Clip extends ${(clipEnd - spec.canvas.duration).toFixed(1)}s beyond video duration`,
          affectedClips: [clip.id],
          suggestion:
            'Trim clip duration or extend canvas duration to fit all content',
        });
      }
    }
  }

  // Check for clips starting before 0
  const negativeClips = spec.composition.tracks
    .flatMap((t) => t.clips)
    .filter((c) => c.startTime < 0);

  if (negativeClips.length > 0) {
    issues.push({
      severity: 'high',
      type: 'timing',
      description: `${negativeClips.length} clips have negative start times`,
      affectedClips: negativeClips.map((c) => c.id),
      suggestion: 'Adjust clip start times to be >= 0',
    });
  }

  return issues;
}

/**
 * Generate actionable suggestions based on issues
 */
function generateSuggestions(issues: Issue[], spec: ProjectSpec): string[] {
  const suggestions: string[] = [];

  // Prioritize high severity issues
  const highIssues = issues.filter((i) => i.severity === 'high');
  if (highIssues.length > 0) {
    suggestions.push(
      `🚨 ${highIssues.length} critical issues to fix: ${highIssues.map((i) => i.type).join(', ')}`
    );
  }

  // Group by type
  const staticIssues = issues.filter((i) => i.type === 'static');
  if (staticIssues.length > 0) {
    suggestions.push(
      `Convert ${staticIssues.length} static image clips to ImageSlideshow with Ken Burns effects`
    );
  }

  const motionIssues = issues.filter((i) => i.type === 'motion');
  if (motionIssues.length > 0) {
    suggestions.push(
      'Add more dynamic motion graphics (Ken Burns effects, text animations, transitions)'
    );
  }

  const pacingIssues = issues.filter((i) => i.type === 'pacing');
  if (pacingIssues.length > 0) {
    suggestions.push(
      'Improve pacing by varying clip durations (mix short 3-5s clips with longer 6-10s clips)'
    );
  }

  const compositionIssues = issues.filter((i) => i.type === 'composition');
  if (compositionIssues.length > 0) {
    suggestions.push(
      'Fix composition issues (overlapping clips, gaps in timeline, missing intro/outro)'
    );
  }

  // Add positive suggestions if video is already good
  if (issues.length === 0) {
    suggestions.push('✨ Video looks great! Consider adding audio tracks or more overlay effects.');
  } else if (issues.filter((i) => i.severity === 'high').length === 0) {
    suggestions.push('👍 Good foundation - refine with the suggested improvements above');
  }

  return suggestions;
}

/**
 * Get detailed issue report as formatted text
 */
export function formatAnalysisReport(result: AnalysisResult): string {
  let report = `# Video Quality Analysis\n\n`;
  report += `**Score: ${result.score}/100**\n\n`;

  if (result.issues.length === 0) {
    report += `✅ No issues found! Video quality is excellent.\n\n`;
    return report;
  }

  // Group by severity
  const high = result.issues.filter((i) => i.severity === 'high');
  const medium = result.issues.filter((i) => i.severity === 'medium');
  const low = result.issues.filter((i) => i.severity === 'low');

  if (high.length > 0) {
    report += `## 🚨 Critical Issues (${high.length})\n\n`;
    high.forEach((issue, i) => {
      report += `${i + 1}. **${issue.type.toUpperCase()}**: ${issue.description}\n`;
      report += `   💡 ${issue.suggestion}\n\n`;
    });
  }

  if (medium.length > 0) {
    report += `## ⚠️ Improvements Recommended (${medium.length})\n\n`;
    medium.forEach((issue, i) => {
      report += `${i + 1}. **${issue.type.toUpperCase()}**: ${issue.description}\n`;
      report += `   💡 ${issue.suggestion}\n\n`;
    });
  }

  if (low.length > 0) {
    report += `## ℹ️ Minor Suggestions (${low.length})\n\n`;
    low.forEach((issue, i) => {
      report += `${i + 1}. **${issue.type.toUpperCase()}**: ${issue.description}\n`;
      report += `   💡 ${issue.suggestion}\n\n`;
    });
  }

  // Add overall suggestions
  if (result.suggestions.length > 0) {
    report += `## 🎯 Action Items\n\n`;
    result.suggestions.forEach((s) => {
      report += `- ${s}\n`;
    });
  }

  return report;
}
