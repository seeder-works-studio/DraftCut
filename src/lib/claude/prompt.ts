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

export interface WebsiteContext {
  title: string;
  textContent: string;
  url: string;
}

export function buildWebsiteContext(ctx: WebsiteContext): string {
  return [
    'WEBSITE CONTEXT (scraped from provided URL):',
    `URL: ${ctx.url}`,
    `Site Title: ${ctx.title}`,
    '',
    'Key Content:',
    ctx.textContent.slice(0, 2000),
    '',
    'IMPORTANT: Use this website content to create relevant, on-brand video copy.',
    'Match the tone and messaging of the website. Use the site title, key phrases,',
    'and product descriptions in the video overlays (IntroTitleCard, CaptionsPop, OutroCTA).',
  ].join('\n');
}

export function buildSystemPrompt(
  assets: Asset[],
  brandKit?: BrandKit,
  websiteContext?: WebsiteContext
): string {
  const assetList = formatAssets(assets);
  const brandKitInfo = formatBrandKit(brandKit);
  const websiteSection = websiteContext ? '\n\n' + buildWebsiteContext(websiteContext) : '';

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
    '7. The "assets" array in output must ONLY contain assets from the AVAILABLE ASSETS list below. If no assets are listed, output "assets": []',
    '',
    'AVAILABLE ASSETS:',
    assetList,
    '',
    'CANVAS:',
    '- Dimensions: 1920x1080 (16:9 horizontal)',
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
    '- IMPORTANT: If video assets are provided, you MUST place them on the video track as the base layer. Reference them by assetId.',
    '- If multiple video assets: place them sequentially on the video track',
    '- If only images: place each image as a clip on the video track (3-5s per image)',
    '- If audio assets are provided: place them on the audio track and sync video duration to audio length',
    '- ALWAYS layer skill overlays ON TOP of the video/image base layer - this is what makes the video interesting',
    '- Place skills on the overlay track at appropriate times that align with the base video',
    '- Always start with IntroTitleCard (0-3s) on the overlay track',
    '- Always end with OutroCTA (last 5s) on the overlay track',
    '- Use CaptionsPop for main content if speech/narration present',
    '- Use LowerThird to identify speakers or topics over the video',
    '- The video track is the BACKGROUND, overlays render ON TOP of it',
    '',
    'OUTPUT SCHEMA:',
    '{',
    '  "version": "1.0.0",',
    '  "metadata": { "created": "<ISO timestamp>", "modified": "<ISO timestamp>", "description": "brief summary" },',
    '  "canvas": { "width": 1920, "height": 1080, "fps": 30, "duration": "<total seconds>", "backgroundColor": "#000000" },',
    '  "assets": [<COPY assets from AVAILABLE ASSETS above, or empty array if none>],',
    '  "composition": {',
    '    "tracks": [',
    '      { "id": "track-video", "type": "video", "clips": [<video/image clips with assetId referencing assets>] },',
    '      { "id": "track-overlay", "type": "overlay", "clips": [{ "id": "clip-1", "type": "skill", "startTime": 0, "duration": 3, "skillType": "IntroTitleCard", "skillProps": { ... } }] },',
    '      { "id": "track-audio", "type": "audio", "clips": [<audio clips with assetId referencing assets>] }',
    '    ]',
    '  }',
    '}',
    '',
    'CLIP STRUCTURE:',
    '- id: unique string (e.g. "clip-1", "clip-intro")',
    '- type: "video" | "audio" | "image" | "skill"',
    '- startTime: seconds on timeline (0-based)',
    '- duration: seconds',
    '- For video clips: { type: "video", assetId: "<id from assets array>", startTime: 0, duration: <asset duration>, trimStart: 0 }',
    '- For audio clips: { type: "audio", assetId: "<id from assets array>", startTime: 0, duration: <asset duration>, trimStart: 0 }',
    '- For image clips: { type: "image", assetId: "<id from assets array>", startTime: 0, duration: 5 }',
    '- For skills: { type: "skill", skillType: "<name>", skillProps: { ... }, startTime: 0, duration: 3 }',
    '- trimStart: optional, seconds into the source file to start playback from',
    '',
    'VALIDATION:',
    '- Clips must not overlap inappropriately on the same track',
    '- Total duration = canvas.duration',
    '- All assetIds must exist in assets array',
    '- All skillTypes must be valid',
    '- skillProps must match the skill\'s expected interface',
  ].join('\n') + websiteSection;
}
