import { z } from 'zod';
import type { ProjectSpec } from './types';

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
  return ProjectSpecSchema.parse(data) as ProjectSpec;
}

export { ProjectSpecSchema, ClipSchema, TrackSchema, AssetSchema, BrandKitSchema };
