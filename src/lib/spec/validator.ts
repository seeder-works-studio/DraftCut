import { z } from 'zod';
import type { ProjectSpec } from './types';
import { logger } from '@/lib/logger';

const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'image']),
  filename: z.string(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  storageKey: z.string().optional(),
});

const TransformSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  opacity: z.number().optional(),
});

const TransitionSchema = z.object({
  type: z.enum(['dissolve', 'slide', 'fade']),
  duration: z.number(),
});

const ClipSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'image', 'skill']),
  startTime: z.number().min(0),
  duration: z.number().min(0),
  assetId: z.string().optional(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
  skillType: z.enum([
    'LowerThird',
    'CaptionsPop',
    'CalloutBoxArrow',
    'IntroTitleCard',
    'OutroCTA',
    'ImageSlideshow',
    'TextReveal',
    'TerminalWindow',
    'KineticTypography',
    'BrandLogo',
    'CountUpNumber',
    'ProgressBar',
  ]).optional(),
  skillProps: z.record(z.string(), z.unknown()).optional(),
  transform: TransformSchema.optional(),
  transition: TransitionSchema.optional(),
});

const TrackSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'overlay']),
  clips: z.array(ClipSchema),
});

const BrandKitSchema = z.object({
  logoAssetId: z.string().optional(),
  primaryFont: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

const ProjectSpecSchema = z.object({
  version: z.string(),
  metadata: z.object({
    created: z.string(),
    modified: z.string(),
    projectId: z.string().optional(),
    description: z.string().optional(),
  }),
  canvas: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    fps: z.number().positive(),
    duration: z.number().positive(),
    backgroundColor: z.string(),
  }),
  assets: z.array(AssetSchema),
  composition: z.object({
    tracks: z.array(TrackSchema),
  }),
  brandKit: BrandKitSchema.optional(),
});

export function validateProjectSpec(data: unknown): ProjectSpec {
  logger.debug('Validator', 'Starting validation of ProjectSpec');
  try {
    const result = ProjectSpecSchema.parse(data) as ProjectSpec;

    // Additional validation: Check that all assetId references exist
    const assetIds = new Set(result.assets.map((a) => a.id));
    const invalidAssets: string[] = [];

    for (const track of result.composition.tracks) {
      for (const clip of track.clips) {
        if (clip.assetId && !assetIds.has(clip.assetId)) {
          logger.warn('Validator', 'Clip references non-existent asset', {
            clipId: clip.id,
            assetId: clip.assetId,
          });
          invalidAssets.push(clip.assetId);
        }

        // Check skillProps for assetId references
        if (clip.skillProps && typeof clip.skillProps === 'object') {
          const props = clip.skillProps as Record<string, unknown>;
          if (props.assetId && typeof props.assetId === 'string' && !assetIds.has(props.assetId)) {
            logger.warn('Validator', 'Skill references non-existent asset', {
              clipId: clip.id,
              skillType: clip.skillType,
              assetId: props.assetId,
            });
            invalidAssets.push(props.assetId);
          }
        }
      }
    }

    // Remove clips with invalid asset references
    if (invalidAssets.length > 0) {
      logger.warn('Validator', `Found ${invalidAssets.length} invalid asset references, removing affected clips`);
      for (const track of result.composition.tracks) {
        track.clips = track.clips.filter((clip) => {
          const hasInvalidAsset =
            (clip.assetId && !assetIds.has(clip.assetId)) ||
            (clip.skillProps &&
             typeof clip.skillProps === 'object' &&
             'assetId' in clip.skillProps &&
             typeof (clip.skillProps as any).assetId === 'string' &&
             !assetIds.has((clip.skillProps as any).assetId));

          if (hasInvalidAsset) {
            logger.info('Validator', 'Removed clip with invalid asset', { clipId: clip.id });
          }

          return !hasInvalidAsset;
        });
      }
    }

    logger.info('Validator', 'ProjectSpec validation successful', {
      version: result.version,
      canvasDuration: result.canvas.duration,
      assetCount: result.assets.length,
      trackCount: result.composition.tracks.length,
      totalClips: result.composition.tracks.reduce((sum, t) => sum + t.clips.length, 0),
      removedInvalidAssets: invalidAssets.length,
    });
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validator', 'ProjectSpec validation failed', {
        errorCount: error.issues.length,
        errors: error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      });
    } else {
      logger.error('Validator', 'Unexpected validation error', error);
    }
    throw error;
  }
}

export { ProjectSpecSchema, ClipSchema, TrackSchema, AssetSchema, BrandKitSchema };
