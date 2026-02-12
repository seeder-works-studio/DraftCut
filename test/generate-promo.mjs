import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load API key
const envFile = readFileSync(resolve(__dirname, '.env'), 'utf8');
const apiKey = envFile.match(/Claude_Anthropic_Key=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error('No API key found in test/.env');
  process.exit(1);
}

const systemPrompt = `You are a video editor AI that generates structured JSON video specifications.

RULES:
1. Output ONLY valid JSON matching the ProjectSpec schema
2. No commentary, explanations, or markdown - just raw JSON
3. Default duration: 15-30 seconds for social media
4. ALWAYS include Intro -> Main content -> Outro structure
5. Use skills (overlays) to enhance storytelling

AVAILABLE ASSETS:
None - create a video using only skills/overlays

CANVAS:
- Dimensions: 1080x1920 (9:16 vertical for social media)
- FPS: 30
- Background: #000000

BRAND KIT:
- Font: Inter
- Primary Color: #3b82f6
- Secondary Color: #8b5cf6

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
- Place skills on overlay track at appropriate times
- Always start with IntroTitleCard (0-3s)
- Always end with OutroCTA (last 5s)
- Use CaptionsPop for main content

OUTPUT SCHEMA:
{
  "version": "1.0.0",
  "metadata": { "created": "<ISO timestamp>", "modified": "<ISO timestamp>", "description": "brief summary" },
  "canvas": { "width": 1080, "height": 1920, "fps": 30, "duration": <total seconds>, "backgroundColor": "#000000" },
  "assets": [],
  "composition": {
    "tracks": [
      { "id": "track-video", "type": "video", "clips": [] },
      { "id": "track-overlay", "type": "overlay", "clips": [<skill clips with skillType + skillProps>] },
      { "id": "track-audio", "type": "audio", "clips": [] }
    ]
  }
}

CLIP STRUCTURE:
- id: unique string (e.g. "clip-1", "clip-intro")
- type: "skill"
- startTime: seconds on timeline (0-based)
- duration: seconds
- skillType + skillProps (matching the skill's props interface above)`;

const userPrompt = `Create a 25-second promo video for "DraftCut" - an AI-powered, local-first, browser-only video editor app.

Key selling points to highlight:
- Describe your video in natural language, AI generates a complete video draft
- 5 built-in motion graphic skills (lower thirds, captions, callouts, intro titles, outro CTAs)
- Everything runs in your browser - no uploads, no servers, total privacy
- Supports Claude, OpenAI, OpenRouter, and Cerebras as AI providers
- Export directly from browser

Make it exciting and modern. Use:
1. A bold IntroTitleCard with "DraftCut" as the title
2. CaptionsPop to highlight the key features with emphasis on important words
3. A LowerThird identifying the product
4. A CalloutBoxArrow pointing to a feature highlight area
5. An OutroCTA encouraging people to try it

Use the brand colors: primary #3b82f6 (blue), secondary #8b5cf6 (purple), dark backgrounds.`;

async function main() {
  console.log('Generating DraftCut promo video spec...');

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let jsonText = response.content[0].type === 'text' ? response.content[0].text : '';
  jsonText = jsonText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  console.log('\nRaw response:');
  console.log(jsonText);

  try {
    const spec = JSON.parse(jsonText);
    console.log('\n--- Parsed successfully ---');
    console.log(`Description: ${spec.metadata?.description}`);
    console.log(`Duration: ${spec.canvas?.duration}s`);
    console.log(`Canvas: ${spec.canvas?.width}x${spec.canvas?.height} @ ${spec.canvas?.fps}fps`);

    const overlayTrack = spec.composition?.tracks?.find(t => t.type === 'overlay');
    if (overlayTrack) {
      console.log(`\nOverlay clips (${overlayTrack.clips.length}):`);
      for (const clip of overlayTrack.clips) {
        console.log(`  - ${clip.skillType} at ${clip.startTime}s for ${clip.duration}s`);
      }
    }

    // Save the spec
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
