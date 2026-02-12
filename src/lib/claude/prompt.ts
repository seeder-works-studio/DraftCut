import type { Asset, BrandKit } from '@/lib/spec/types';

function formatAssets(assets: Asset[]): string {
  if (assets.length === 0) return 'None - create a video using only skills/overlays';
  return assets
    .map((a) => {
      const dur = a.duration ? `${a.duration}s` : '';
      const dims = a.width && a.height ? `${a.width}x${a.height}` : '';
      return `- ${a.id}: ${a.type} "${a.filename}" ${dur} ${dims}`.trim();
    })
    .join('\n');
}

function formatBrandKit(brandKit?: BrandKit): string {
  if (!brandKit) return 'None - use defaults';
  const font = brandKit.primaryFont || 'Inter';
  const primary = brandKit.primaryColor || '#3b82f6';
  const secondary = brandKit.secondaryColor || '#8b5cf6';
  return `- Font: ${font}\n- Primary Color: ${primary}\n- Secondary Color: ${secondary}`;
}

export function buildSystemPrompt(
  assets: Asset[],
  brandKit?: BrandKit
): string {
  const assetList = formatAssets(assets);
  const brandKitInfo = formatBrandKit(brandKit);

  return [
    'You are a video editor AI that generates structured JSON video specifications.',
    '',
    'RULES:',
    '1. Output ONLY valid JSON matching the ProjectSpec schema',
    '2. No commentary, explanations, or markdown - just raw JSON',
    '3. Use provided assets intelligently (best video as base layer)',
    '4. Default duration: 15-30 seconds for social media',
    '5. ALWAYS include Intro -> Main content -> Outro structure',
    '6. Use skills (overlays) to enhance storytelling',
    '',
    'AVAILABLE ASSETS:',
    assetList,
    '',
    'CANVAS:',
    '- Dimensions: 1080x1920 (9:16 vertical for social media)',
    '- FPS: 30',
    '- Background: #000000',
    '',
    'BRAND KIT:',
    brandKitInfo,
    '',
    'AVAILABLE SKILLS (Remotion overlays):',
    '1. LowerThird: name/title bars for speaker identification',
    '   Props: { name: string, title: string, position: "bottom-left"|"bottom-center"|"bottom-right", backgroundColor: string, textColor: string }',
    '',
    '2. CaptionsPop: timed captions with word emphasis',
    '   Props: { captions: [{ text: string, startTime: number, duration: number, emphasizedWords?: number[] }], fontSize: number, fontFamily: string, color: string, backgroundColor?: string, position: "top"|"center"|"bottom" }',
    '',
    '3. CalloutBoxArrow: highlight specific screen regions',
    '   Props: { text?: string, targetX: number, targetY: number, boxWidth: number, boxHeight: number, arrowPosition: "top"|"bottom"|"left"|"right", strokeColor: string, fillColor: string, strokeWidth: number }',
    '',
    '4. IntroTitleCard: full-screen title card (always use at start)',
    '   Props: { title: string, subtitle?: string, backgroundColor: string, titleColor: string, subtitleColor: string }',
    '',
    '5. OutroCTA: call-to-action with button (always use at end)',
    '   Props: { heading: string, ctaText: string, url?: string, backgroundColor: string, textColor: string, buttonColor: string, buttonTextColor: string }',
    '',
    'STRATEGY:',
    '- If video assets: use longest/best one as base layer on video track',
    '- If only images: create slideshow (3-5s per image) with dissolve transitions',
    '- If audio: sync video duration to audio length',
    '- Place skills on overlay track at appropriate times',
    '- Always start with IntroTitleCard (0-3s)',
    '- Always end with OutroCTA (last 5s)',
    '- Use CaptionsPop for main content if speech/narration present',
    '',
    'OUTPUT SCHEMA:',
    '{',
    '  "version": "1.0.0",',
    '  "metadata": { "created": "<ISO timestamp>", "modified": "<ISO timestamp>", "description": "brief summary" },',
    '  "canvas": { "width": 1080, "height": 1920, "fps": 30, "duration": "<total seconds>", "backgroundColor": "#000000" },',
    '  "assets": ["<same as provided input assets>"],',
    '  "composition": {',
    '    "tracks": [',
    '      { "id": "track-video", "type": "video", "clips": ["<video/image clips>"] },',
    '      { "id": "track-overlay", "type": "overlay", "clips": ["<skill clips with skillType + skillProps>"] },',
    '      { "id": "track-audio", "type": "audio", "clips": ["<audio clips>"] }',
    '    ]',
    '  }',
    '}',
    '',
    'CLIP STRUCTURE:',
    '- id: unique string (e.g. "clip-1", "clip-intro")',
    '- type: "video" | "audio" | "image" | "skill"',
    '- startTime: seconds on timeline (0-based)',
    '- duration: seconds',
    '- For media: assetId (reference to assets array)',
    '- For skills: skillType + skillProps (matching the skill\'s props interface above)',
    '',
    'VALIDATION:',
    '- Clips must not overlap inappropriately on the same track',
    '- Total duration = canvas.duration',
    '- All assetIds must exist in assets array',
    '- All skillTypes must be valid',
    '- skillProps must match the skill\'s expected interface',
  ].join('\n');
}
