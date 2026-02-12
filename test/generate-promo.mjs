import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load API key from root .env
const envFile = readFileSync(resolve(rootDir, '.env'), 'utf8');
const apiKey = envFile.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error('No ANTHROPIC_API_KEY found in .env');
  process.exit(1);
}

// Discover demo images
const demoDir = resolve(rootDir, 'Demo');
const imageFiles = readdirSync(demoDir)
  .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
  .sort();

console.log(`Found ${imageFiles.length} demo images:`);
imageFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

// Build asset list like the app does
const assets = imageFiles.map((f, i) => ({
  id: `asset-img-${i + 1}`,
  type: 'image',
  filename: f,
}));

const assetList = assets
  .map(a => `- ${a.id}: ${a.type} "${a.filename}"`)
  .join('\n');

const systemPrompt = `You are a video editor AI that generates structured JSON video specifications.

RULES:
1. Output ONLY valid JSON matching the ProjectSpec schema
2. No commentary, explanations, or markdown - just raw JSON
3. Use provided assets intelligently
4. Default duration: 15-30 seconds
5. ALWAYS include Intro -> Main content -> Outro structure
6. Use skills (overlays) to enhance storytelling
7. The "assets" array in output must ONLY contain assets from the AVAILABLE ASSETS list below.

AVAILABLE ASSETS:
${assetList}

CANVAS:
- Dimensions: 1920x1080 (16:9 horizontal)
- FPS: 30
- Background: #000000

BRAND KIT:
- Font: Inter
- Primary Color: #D4A574
- Secondary Color: #8B5CF6

AVAILABLE SKILLS (Remotion overlays):
1. LowerThird: name/title bars for speaker identification
   Props: { name: string, title: string, position: "bottom-left"|"bottom-center"|"bottom-right", backgroundColor: string, textColor: string }

2. CaptionsPop: timed captions with word emphasis
   Props: { captions: [{ text: string, startTime: number, duration: number, emphasizedWords?: number[] }], fontSize: number, fontFamily: string, color: string, backgroundColor?: string, position: "top"|"center"|"bottom" }

3. CalloutBoxArrow: highlight specific screen regions
   Props: { text?: string, targetX: number, targetY: number, boxWidth: number, boxHeight: number, arrowPosition: "top"|"bottom"|"left"|"right", strokeColor: string, fillColor: string, strokeWidth: number }

4. IntroTitleCard: full-screen title card (always use at start)
   Props: { title: string, subtitle?: string, backgroundColor: string, titleColor: string, subtitleColor: string }

5. OutroCTA: call-to-action with button (always use at end)
   Props: { heading: string, ctaText: string, url?: string, backgroundColor: string, textColor: string, buttonColor: string, buttonTextColor: string }

STRATEGY:
- Place images sequentially on the video track (3s per image)
- Layer skill overlays ON TOP of the images on the overlay track
- Always start with IntroTitleCard (0-3s) on the overlay track
- Always end with OutroCTA (last 5s) on the overlay track
- Use CaptionsPop for main content over images
- The video track is the BACKGROUND, overlays render ON TOP of it

OUTPUT SCHEMA:
{
  "version": "1.0.0",
  "metadata": { "created": "<ISO timestamp>", "modified": "<ISO timestamp>", "description": "brief summary" },
  "canvas": { "width": 1920, "height": 1080, "fps": 30, "duration": "<total seconds>", "backgroundColor": "#000000" },
  "assets": [<COPY assets from AVAILABLE ASSETS above>],
  "composition": {
    "tracks": [
      { "id": "track-video", "type": "video", "clips": [<image clips with assetId>] },
      { "id": "track-overlay", "type": "overlay", "clips": [<skill clips>] },
      { "id": "track-audio", "type": "audio", "clips": [] }
    ]
  }
}

CLIP STRUCTURE:
- id: unique string (e.g. "clip-1", "clip-intro")
- For image clips: { id, type: "image", assetId: "<id from assets>", startTime: <seconds>, duration: <seconds> }
- For skills: { id, type: "skill", skillType: "<name>", skillProps: { ... }, startTime: <seconds>, duration: <seconds> }`;

const userPrompt = `Create a 30-second demo video for "DraftCut" — an AI video editor built at the "Built with Opus 4.6: Claude Code Hackathon" by Cerebral Valley x Anthropic.

Use all 9 uploaded screenshots as a slideshow. Structure:

1. INTRO (0-3s): Bold title card — "DraftCut" with subtitle "AI Video Editor — Built with Claude Code"
2. HACKATHON CONTEXT (3-12s): Show the Discord announcement, Opus 4.6 intro, and speaker screenshots with captions like "500 builders. $100K in prizes. One week to ship."
3. THE TOOL (12-22s): Show the hackathon landing page and registration screenshots with captions: "Describe a video. Upload assets. AI drafts the edit." then "Runs in your browser. 100% private."
4. OUTRO (22-30s): Call to action — "Try DraftCut" with subtitle "Built with Opus 4.6 + Claude Code"

Dark background (#0a0a0a). Brand colors: warm gold #D4A574, Anthropic purple #8B5CF6. Bold modern captions. Energetic pacing.`;

async function main() {
  console.log('\nGenerating DraftCut hackathon promo spec with Claude...\n');

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let jsonText = response.content[0].type === 'text' ? response.content[0].text : '';
  jsonText = jsonText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const spec = JSON.parse(jsonText);
    console.log('--- Parsed successfully ---');
    console.log(`Description: ${spec.metadata?.description}`);
    console.log(`Duration: ${spec.canvas?.duration}s`);
    console.log(`Canvas: ${spec.canvas?.width}x${spec.canvas?.height} @ ${spec.canvas?.fps}fps`);
    console.log(`Assets: ${spec.assets?.length}`);

    const videoTrack = spec.composition?.tracks?.find(t => t.type === 'video');
    if (videoTrack) {
      console.log(`\nVideo track clips (${videoTrack.clips.length}):`);
      for (const clip of videoTrack.clips) {
        console.log(`  - ${clip.type} "${clip.assetId}" at ${clip.startTime}s for ${clip.duration}s`);
      }
    }

    const overlayTrack = spec.composition?.tracks?.find(t => t.type === 'overlay');
    if (overlayTrack) {
      console.log(`\nOverlay clips (${overlayTrack.clips.length}):`);
      for (const clip of overlayTrack.clips) {
        console.log(`  - ${clip.skillType} at ${clip.startTime}s for ${clip.duration}s`);
      }
    }

    const outputPath = resolve(__dirname, 'promo-spec.json');
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    console.log(`\nSaved to: ${outputPath}`);

  } catch (err) {
    console.error('\nFailed to parse JSON:', err.message);
    const outputPath = resolve(__dirname, 'promo-raw.txt');
    writeFileSync(outputPath, jsonText);
    console.log(`Raw output saved to: ${outputPath}`);
  }
}

main().catch(console.error);
