/**
 * Post-generation validation and auto-fix
 * Validates generated specs and fixes common issues before showing to user
 */

import type { ProjectSpec, Clip, Track } from './types';
import { logger } from '@/lib/logger';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  clipId?: string;
  trackId?: string;
  assetId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  fixedSpec?: ProjectSpec;
  autoFixed: boolean;
}

/**
 * Validate and auto-fix generated spec
 */
export function validateAndFixSpec(
  spec: ProjectSpec,
  availableAssets: Set<string>
): ValidationResult {
  console.group('🔍 POST-GENERATION VALIDATION');
  console.log('📊 Available assets:', Array.from(availableAssets));
  console.log('📊 Spec assets:', spec.assets.map(a => a.id));
  console.log('📊 Track count:', spec.composition.tracks.length);

  const issues: ValidationIssue[] = [];
  let fixedSpec = JSON.parse(JSON.stringify(spec)) as ProjectSpec;
  let autoFixed = false;

  logger.info('PostGenValidation', 'Starting validation', {
    trackCount: spec.composition.tracks.length,
    availableAssets: Array.from(availableAssets),
  });

  // 1. Check for clips referencing missing assets
  for (const track of fixedSpec.composition.tracks) {
    const invalidClips: string[] = [];

    for (const clip of track.clips) {
      if (clip.assetId && !availableAssets.has(clip.assetId)) {
        issues.push({
          severity: 'error',
          type: 'missing-asset',
          message: `Clip "${clip.id}" references missing asset "${clip.assetId}"`,
          clipId: clip.id,
          trackId: track.id,
          assetId: clip.assetId,
        });
        invalidClips.push(clip.id);
        autoFixed = true;
      }
    }

    // Remove clips with missing assets
    if (invalidClips.length > 0) {
      track.clips = track.clips.filter((c) => !invalidClips.includes(c.id));
      logger.warn('PostGenValidation', 'Removed clips with missing assets', {
        trackId: track.id,
        removedClips: invalidClips,
      });
    }
  }

  // 2. Check for ImageSlideshow with missing slide assets
  for (const track of fixedSpec.composition.tracks) {
    const invalidSlideShows: string[] = [];

    for (const clip of track.clips) {
      if (clip.type === 'skill' && clip.skillType === 'ImageSlideshow') {
        const slides = (clip.skillProps as any)?.slides || [];
        const validSlides = slides.filter((slide: any) => {
          if (slide.assetId && !availableAssets.has(slide.assetId)) {
            issues.push({
              severity: 'error',
              type: 'missing-slideshow-asset',
              message: `ImageSlideshow "${clip.id}" references missing asset "${slide.assetId}"`,
              clipId: clip.id,
              trackId: track.id,
              assetId: slide.assetId,
            });
            return false;
          }
          return true;
        });

        // If no valid slides remain, mark slideshow for removal
        if (slides.length > 0 && validSlides.length === 0) {
          invalidSlideShows.push(clip.id);
          autoFixed = true;
          logger.warn('PostGenValidation', 'ImageSlideshow has no valid slides', {
            clipId: clip.id,
          });
        } else if (validSlides.length < slides.length) {
          // Update slideshow with only valid slides
          (clip.skillProps as any).slides = validSlides;
          autoFixed = true;
          logger.info('PostGenValidation', 'Filtered invalid slides', {
            clipId: clip.id,
            originalCount: slides.length,
            validCount: validSlides.length,
          });
        }
      }
    }

    // Remove slideshows with no valid slides
    if (invalidSlideShows.length > 0) {
      track.clips = track.clips.filter((c) => !invalidSlideShows.includes(c.id));
    }
  }

  // 3. Check for clips with invalid durations
  for (const track of fixedSpec.composition.tracks) {
    for (const clip of track.clips) {
      if (clip.duration <= 0) {
        issues.push({
          severity: 'error',
          type: 'invalid-duration',
          message: `Clip "${clip.id}" has invalid duration: ${clip.duration}`,
          clipId: clip.id,
          trackId: track.id,
        });
        // Fix: set minimum duration to 1 second
        clip.duration = 1;
        autoFixed = true;
      } else if (clip.duration < 0.3) {
        issues.push({
          severity: 'warning',
          type: 'very-short-duration',
          message: `Clip "${clip.id}" has very short duration: ${clip.duration}s (may cause render issues)`,
          clipId: clip.id,
          trackId: track.id,
        });
        // Fix: extend to minimum 0.5 seconds
        clip.duration = 0.5;
        autoFixed = true;
      }
    }
  }

  // 4. Check for clips extending beyond canvas duration
  for (const track of fixedSpec.composition.tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd > spec.canvas.duration) {
        issues.push({
          severity: 'warning',
          type: 'clip-exceeds-canvas',
          message: `Clip "${clip.id}" extends beyond canvas duration (${clipEnd}s > ${spec.canvas.duration}s)`,
          clipId: clip.id,
          trackId: track.id,
        });
        // Fix: trim clip to fit canvas
        clip.duration = spec.canvas.duration - clip.startTime;
        autoFixed = true;
      }
    }
  }

  // 5. Check for empty tracks and clean them up
  for (const track of fixedSpec.composition.tracks) {
    if (track.clips.length === 0) {
      issues.push({
        severity: 'info',
        type: 'empty-track',
        message: `Track "${track.id}" has no clips`,
        trackId: track.id,
      });
    }
  }

  // 6. Warn if no video or overlay content
  const hasVideoContent = fixedSpec.composition.tracks.some(
    (t) => t.type === 'video' && t.clips.length > 0
  );
  const hasOverlayContent = fixedSpec.composition.tracks.some(
    (t) => t.type === 'overlay' && t.clips.length > 0
  );

  if (!hasVideoContent && !hasOverlayContent) {
    issues.push({
      severity: 'error',
      type: 'no-content',
      message: 'Video has no visual content (no video or overlay clips)',
    });
  }

  // 7. Check assets array matches available assets
  const specAssetIds = new Set(spec.assets.map((a) => a.id));
  const unusedAssets = Array.from(availableAssets).filter(
    (id) => !specAssetIds.has(id)
  );

  if (unusedAssets.length > 0) {
    issues.push({
      severity: 'info',
      type: 'unused-assets',
      message: `${unusedAssets.length} uploaded assets are not used in the video`,
    });
  }

  const valid = issues.filter((i) => i.severity === 'error').length === 0;

  // Log results
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  console.log('📋 Validation Results:');
  console.log(`   ✅ Valid: ${valid}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  console.log(`   ⚠️  Warnings: ${warnings.length}`);
  console.log(`   🔧 Auto-fixed: ${autoFixed}`);

  if (errors.length > 0) {
    console.group('❌ ERRORS FOUND:');
    errors.forEach(e => console.error(`   • ${e.message}`));
    console.groupEnd();
  }

  if (warnings.length > 0) {
    console.group('⚠️  WARNINGS:');
    warnings.forEach(w => console.warn(`   • ${w.message}`));
    console.groupEnd();
  }

  console.groupEnd(); // End validation group

  logger.info('PostGenValidation', 'Validation complete', {
    valid,
    issueCount: issues.length,
    autoFixed,
    errors: errors.length,
    warnings: warnings.length,
  });

  return {
    valid,
    issues,
    fixedSpec: autoFixed ? fixedSpec : undefined,
    autoFixed,
  };
}

/**
 * Format validation issues for display
 */
export function formatValidationReport(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return '✅ Video spec is valid - no issues found';
  }

  const lines: string[] = [];

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const info = result.issues.filter((i) => i.severity === 'info');

  if (errors.length > 0) {
    lines.push(`❌ ${errors.length} error(s):`);
    errors.forEach((e) => lines.push(`   • ${e.message}`));
  }

  if (warnings.length > 0) {
    lines.push(`⚠️  ${warnings.length} warning(s):`);
    warnings.forEach((w) => lines.push(`   • ${w.message}`));
  }

  if (info.length > 0) {
    lines.push(`ℹ️  ${info.length} info:`);
    info.forEach((i) => lines.push(`   • ${i.message}`));
  }

  if (result.autoFixed) {
    lines.push('');
    lines.push('🔧 Issues were automatically fixed');
  }

  return lines.join('\n');
}
