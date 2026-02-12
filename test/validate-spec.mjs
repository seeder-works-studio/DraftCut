import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(resolve(__dirname, 'promo-spec.json'), 'utf8'));

const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'image']),
  filename: z.string(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  storageKey: z.string().optional(),
});

const ClipSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'image', 'skill']),
  startTime: z.number().min(0),
  duration: z.number().min(0),
  assetId: z.string().optional(),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
  skillType: z.enum(['LowerThird', 'CaptionsPop', 'CalloutBoxArrow', 'IntroTitleCard', 'OutroCTA']).optional(),
  skillProps: z.record(z.string(), z.unknown()).optional(),
  transform: z.object({ x: z.number().optional(), y: z.number().optional(), scale: z.number().optional(), opacity: z.number().optional() }).optional(),
  transition: z.object({ type: z.enum(['dissolve', 'slide', 'fade']), duration: z.number() }).optional(),
});

const ProjectSpecSchema = z.object({
  version: z.string(),
  metadata: z.object({ created: z.string(), modified: z.string(), projectId: z.string().optional(), description: z.string().optional() }),
  canvas: z.object({ width: z.number().positive(), height: z.number().positive(), fps: z.number().positive(), duration: z.number().positive(), backgroundColor: z.string() }),
  assets: z.array(AssetSchema),
  composition: z.object({ tracks: z.array(z.object({ id: z.string(), type: z.enum(['video', 'audio', 'overlay']), clips: z.array(ClipSchema) })) }),
  brandKit: z.object({ logoAssetId: z.string().optional(), primaryFont: z.string().optional(), primaryColor: z.string().optional(), secondaryColor: z.string().optional() }).optional(),
});

try {
  ProjectSpecSchema.parse(spec);
  console.log('Validation PASSED - spec is valid ProjectSpec');
} catch (err) {
  console.error('Validation FAILED:');
  console.error(JSON.stringify(err.issues, null, 2));
}
