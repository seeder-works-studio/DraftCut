# DraftCut Implementation Plan

## Context

DraftCut is a **local-first, browser-only prompt-to-video editor** that enables users to create professional video content by describing what they want in natural language. The app addresses the gap between AI-generated content ideas and polished video output by:

1. **Accepting a text prompt** + uploaded media assets (video/images/audio)
2. **Generating a structured video specification** using Claude AI
3. **Opening a timeline editor** where users can refine the generated composition
4. **Exporting the final video** entirely in the browser (no server required)

### Why This Is Needed

Traditional video editors require manual timeline construction, clip placement, and effect configuration. DraftCut inverts this workflow: users describe their intent ("make a 20s promo with captions and logo outro"), and the AI generates a complete video specification with motion graphics, transitions, and timing. This is valuable for:

- **Content creators** who need quick social media videos
- **Non-technical users** who lack video editing expertise
- **Privacy-conscious users** who want to keep media files local (no cloud uploads)

### Technical Challenge

The core technical challenge is integrating **Remotion** (React-based programmatic video) with **Diffusion Studio Core** (browser timeline engine) in a way that:
- Remotion skills render as motion graphics overlays
- Diffusion Studio composites base video + Remotion-rendered overlays
- Everything happens in the browser (no backend, no server-side rendering)

---

## Architecture Overview

### Hybrid Remotion + Diffusion Studio Architecture

**Remotion's Role:**
- Create the 5 motion graphic skills (LowerThird, CaptionsPop, CalloutBoxArrow, IntroTitleCard, OutroCTA)
- Skills are React components using `useCurrentFrame()`, `spring()`, `interpolate()`
- Each skill is a registered Remotion composition with props

**Diffusion Studio Core's Role:**
- Timeline playback and compositing engine
- Handles base video/audio/image tracks
- Composites Remotion-rendered overlay clips on top of base media
- Exports final video using WebCodecs

**Integration Strategy:**

The app uses a **two-phase rendering approach**:

1. **Preview Mode (Real-time)**:
   - Use `@remotion/player` to preview Remotion skills in an overlay iframe
   - Diffusion Studio plays base video
   - Skills preview in sync using shared playback state
   - No encoding required - pure DOM rendering

2. **Export Mode (High-fidelity)**:
   - Render each Remotion skill to a video clip using browser-based capture
   - Add rendered clips to Diffusion Studio composition
   - Diffusion Studio composites all layers and exports final video

**Browser-Based Remotion Rendering:**

Since Remotion's `@remotion/renderer` is Node.js-only, we use **canvas capture + MediaRecorder**:

```typescript
// Pseudocode for rendering Remotion in browser
async function renderRemotionSkill(composition: RemotionComposition): Promise<Blob> {
  const player = new Player({ component: composition, durationInFrames, fps });
  const canvas = document.createElement('canvas');

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

  // Play through composition, recording to video
  for (let frame = 0; frame < durationInFrames; frame++) {
    player.seekTo(frame);
    await renderFrameToCanvas(player, canvas);
  }

  return recorder.getBlob(); // WebM video clip
}
```

---

## Project Specification Schema

The JSON structure that Claude generates and the editor consumes:

```typescript
interface ProjectSpec {
  version: string; // "1.0.0"

  metadata: {
    created: string; // ISO timestamp
    modified: string;
    projectId?: string;
    description?: string;
  };

  canvas: {
    width: number; // 1080 (for 9:16)
    height: number; // 1920
    fps: number; // 30
    duration: number; // seconds
    backgroundColor: string; // "#000000"
  };

  assets: Asset[];

  composition: {
    tracks: Track[];
  };

  brandKit?: BrandKit;
}

interface Asset {
  id: string; // UUID
  type: 'video' | 'audio' | 'image';
  filename: string;
  duration?: number; // seconds (for video/audio)
  width?: number; // pixels
  height?: number;
  storageKey?: string; // IndexedDB key
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips: Clip[];
}

interface Clip {
  id: string;
  type: 'video' | 'audio' | 'image' | 'skill';

  // Timing
  startTime: number; // seconds
  duration: number; // seconds

  // Media clips
  assetId?: string;
  trimStart?: number;
  trimEnd?: number;

  // Skill clips (Remotion)
  skillType?: SkillType;
  skillProps?: SkillProps;

  // Transform
  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    opacity?: number;
  };

  // Transition
  transition?: {
    type: 'dissolve' | 'slide' | 'fade';
    duration: number;
  };
}

type SkillType = 'LowerThird' | 'CaptionsPop' | 'CalloutBoxArrow' | 'IntroTitleCard' | 'OutroCTA';

interface BrandKit {
  logoAssetId?: string;
  primaryFont?: string; // "Inter"
  primaryColor?: string; // "#3b82f6"
  secondaryColor?: string; // "#8b5cf6"
}
```

**Validation:** Use Zod schemas to validate the spec at runtime and ensure type safety.

---

## Remotion Skills Implementation

### Skill 1: LowerThird

Animated name/title bar, typically positioned at bottom-left.

```typescript
// /src/skills/LowerThird.tsx
import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';

interface LowerThirdProps {
  name: string;
  title: string;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  backgroundColor: string;
  textColor: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name, title, position, backgroundColor, textColor
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide-in animation
  const slideProgress = spring({ frame, fps, config: { damping: 18 } });
  const translateX = -300 * (1 - slideProgress);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: position === 'bottom-left' ? 40 : undefined,
          right: position === 'bottom-right' ? 40 : undefined,
          transform: `translateX(${translateX}px)`,
          backgroundColor,
          padding: '20px 30px',
          borderRadius: 8,
        }}
      >
        <div style={{ color: textColor, fontSize: 32, fontWeight: 'bold' }}>
          {name}
        </div>
        <div style={{ color: textColor, fontSize: 24 }}>
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Registration:**
```typescript
// /src/skills/remotion/Root.tsx
<Composition
  id="LowerThird"
  component={LowerThird}
  durationInFrames={150} // 5 seconds at 30fps
  fps={30}
  width={1080}
  height={1920}
  defaultProps={{
    name: 'John Doe',
    title: 'CEO',
    position: 'bottom-left',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
  }}
/>
```

### Skill 2: CaptionsPop

Timed captions with word emphasis and "pop" animation.

```typescript
// /src/skills/CaptionsPop.tsx
interface Caption {
  text: string;
  startTime: number; // relative to clip start (seconds)
  duration: number;
  emphasizedWords?: number[]; // word indices
}

interface CaptionsPopProps {
  captions: Caption[];
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
}

export const CaptionsPop: React.FC<CaptionsPopProps> = ({
  captions, fontSize, fontFamily, color, backgroundColor, position
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  // Find active caption
  const activeCaption = captions.find(
    cap => time >= cap.startTime && time < cap.startTime + cap.duration
  );

  if (!activeCaption) return null;

  const words = activeCaption.text.split(' ');
  const wordDuration = activeCaption.duration / words.length;
  const currentWordIndex = Math.floor((time - activeCaption.startTime) / wordDuration);

  const y = position === 'top' ? '20%' : position === 'center' ? '50%' : '80%';

  return (
    <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: y }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {words.map((word, idx) => {
          const isActive = idx === currentWordIndex;
          const isEmphasized = activeCaption.emphasizedWords?.includes(idx);

          // Pop animation for active word
          const popProgress = isActive
            ? spring({ frame: frame % fps, fps, config: { damping: 10 } })
            : 1;
          const scale = 1 + (isActive ? 0.2 * popProgress : 0);

          return (
            <span
              key={idx}
              style={{
                fontSize,
                fontFamily,
                fontWeight: isEmphasized ? 'bold' : 'normal',
                color,
                backgroundColor: backgroundColor || 'transparent',
                padding: '5px 10px',
                transform: `scale(${scale})`,
                display: 'inline-block',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

### Skill 3: CalloutBoxArrow

Highlight box with arrow pointing to a specific region.

```typescript
// /src/skills/CalloutBoxArrow.tsx
interface CalloutBoxArrowProps {
  text?: string;
  targetX: number; // pixels
  targetY: number;
  boxWidth: number;
  boxHeight: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export const CalloutBoxArrow: React.FC<CalloutBoxArrowProps> = ({
  text, targetX, targetY, boxWidth, boxHeight, arrowPosition,
  strokeColor, fillColor, strokeWidth
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps });

  // Calculate box position based on arrow direction
  const arrowLength = 50;
  let boxX = targetX, boxY = targetY;

  if (arrowPosition === 'bottom') {
    boxX = targetX - boxWidth / 2;
    boxY = targetY - boxHeight - arrowLength;
  } else if (arrowPosition === 'top') {
    boxX = targetX - boxWidth / 2;
    boxY = targetY + arrowLength;
  } // ... other positions

  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" style={{ opacity: fadeIn }}>
        {/* Arrow */}
        <line
          x1={targetX}
          y1={targetY}
          x2={boxX + boxWidth / 2}
          y2={boxY + (arrowPosition === 'bottom' ? boxHeight : 0)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Box */}
        <rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />

        {/* Text */}
        {text && (
          <text
            x={boxX + boxWidth / 2}
            y={boxY + boxHeight / 2}
            textAnchor="middle"
            fill="#000"
            fontSize={20}
          >
            {text}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
```

### Skill 4: IntroTitleCard

Full-screen animated title card with logo.

```typescript
// /src/skills/IntroTitleCard.tsx
interface IntroTitleCardProps {
  title: string;
  subtitle?: string;
  logoAssetId?: string;
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
}

export const IntroTitleCard: React.FC<IntroTitleCardProps> = ({
  title, subtitle, logoAssetId, backgroundColor, titleColor, subtitleColor
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({ frame, fps, config: { damping: 20 } });
  const titleY = 100 * (1 - slideUp);

  return (
    <AbsoluteFill style={{ backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
      {logoAssetId && (
        <img
          src={`/assets/${logoAssetId}`} // Asset URL resolution
          style={{ width: 150, marginBottom: 50, opacity: slideUp }}
        />
      )}

      <h1
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: titleColor,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <h2
          style={{
            fontSize: 36,
            color: subtitleColor,
            opacity: slideUp,
            textAlign: 'center',
            marginTop: 20,
          }}
        >
          {subtitle}
        </h2>
      )}
    </AbsoluteFill>
  );
};
```

### Skill 5: OutroCTA

Call-to-action with animated button and logo.

```typescript
// /src/skills/OutroCTA.tsx
interface OutroCTAProps {
  heading: string;
  ctaText: string;
  url?: string;
  logoAssetId?: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

export const OutroCTA: React.FC<OutroCTAProps> = ({
  heading, ctaText, url, logoAssetId, backgroundColor, textColor, buttonColor, buttonTextColor
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps });
  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.05 + 1;

  return (
    <AbsoluteFill style={{ backgroundColor, justifyContent: 'center', alignItems: 'center', opacity: fadeIn }}>
      {logoAssetId && (
        <img src={`/assets/${logoAssetId}`} style={{ width: 150, marginBottom: 40 }} />
      )}

      <h2 style={{ fontSize: 48, fontWeight: 'bold', color: textColor, marginBottom: 40 }}>
        {heading}
      </h2>

      <button
        style={{
          backgroundColor: buttonColor,
          color: buttonTextColor,
          fontSize: 28,
          fontWeight: 'bold',
          padding: '20px 60px',
          borderRadius: 35,
          border: 'none',
          transform: `scale(${pulse})`,
          cursor: 'pointer',
        }}
      >
        {ctaText}
      </button>

      {url && (
        <p style={{ fontSize: 20, color: textColor, marginTop: 30 }}>
          {url}
        </p>
      )}
    </AbsoluteFill>
  );
};
```

### Skill Registry

```typescript
// /src/skills/registry.ts
import { z } from 'zod';

interface SkillDefinition {
  id: SkillType;
  name: string;
  component: React.FC<any>;
  defaultDuration: number; // seconds
  defaultProps: any;
  propsSchema: z.ZodObject<any>;
}

export const SKILL_REGISTRY: Record<SkillType, SkillDefinition> = {
  LowerThird: {
    id: 'LowerThird',
    name: 'Lower Third',
    component: LowerThird,
    defaultDuration: 5,
    defaultProps: { /* ... */ },
    propsSchema: LowerThirdPropsSchema,
  },
  // ... other skills
};
```

---

## Claude AI Integration

### System Prompt for Video Generation

```typescript
// /src/lib/claude/prompt.ts
export function buildSystemPrompt(
  assets: Asset[],
  brandKit?: BrandKit
): string {
  return `You are a video editor AI that generates structured JSON video specifications.

RULES:
1. Output ONLY valid JSON matching the ProjectSpec schema
2. No commentary, explanations, or markdown
3. Use provided assets intelligently (best video as base layer)
4. Default duration: 15-30 seconds for social media
5. ALWAYS include Intro → Main content → Outro structure
6. Use skills (overlays) to enhance storytelling

AVAILABLE ASSETS:
${assets.map(a => `- ${a.id}: ${a.type} "${a.filename}" ${a.duration ? `${a.duration}s` : ''} ${a.width}x${a.height}`).join('\n')}

CANVAS:
- Dimensions: 1080x1920 (9:16 vertical for social media)
- FPS: 30
- Background: #000000

BRAND KIT:
${brandKit ? `
- Logo: ${brandKit.logoAssetId || 'none'}
- Font: ${brandKit.primaryFont || 'Inter'}
- Primary Color: ${brandKit.primaryColor || '#3b82f6'}
- Secondary Color: ${brandKit.secondaryColor || '#8b5cf6'}
` : 'None - use defaults'}

AVAILABLE SKILLS (Remotion overlays):
1. LowerThird: name/title bars for speaker identification
2. CaptionsPop: timed captions with word emphasis (use for accessibility)
3. CalloutBoxArrow: highlight specific screen regions
4. IntroTitleCard: full-screen title card (always use at start)
5. OutroCTA: call-to-action with button (always use at end)

STRATEGY:
- If video assets: use longest/best one as base layer on video track
- If only images: create slideshow (3-5s per image) with dissolve transitions
- If audio: sync video duration to audio length
- Place skills on overlay track at appropriate times
- Always start with IntroTitleCard (0-3s)
- Always end with OutroCTA (last 5s)
- Use CaptionsPop for main content if speech/narration present

OUTPUT SCHEMA:
{
  "version": "1.0.0",
  "metadata": { "created": "ISO timestamp", "description": "brief summary" },
  "canvas": { "width": 1080, "height": 1920, "fps": 30, "duration": <total seconds>, "backgroundColor": "#000000" },
  "assets": [/* same as input */],
  "composition": {
    "tracks": [
      { "id": "track-video", "type": "video", "clips": [/* video/image clips */] },
      { "id": "track-overlay", "type": "overlay", "clips": [/* skill clips with skillType + skillProps */] },
      { "id": "track-audio", "type": "audio", "clips": [/* audio clips */] }
    ]
  },
  "brandKit": { /* same as input */ }
}

CLIP STRUCTURE:
- id: unique string
- type: "video" | "audio" | "image" | "skill"
- startTime: seconds on timeline (0-based)
- duration: seconds
- For media: assetId (reference to assets array)
- For skills: skillType ("LowerThird" | "CaptionsPop" | ...) + skillProps (object matching skill's props interface)

VALIDATION:
- Clips must not overlap inappropriately
- Total duration = canvas.duration
- All assetIds must exist in assets array
- All skillTypes must be valid
- skillProps must match the skill's expected interface`;
}
```

### Claude API Client

```typescript
// /src/lib/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';
import { validateProjectSpec } from '../spec/validator';

export interface AIProviderConfig {
  provider: 'claude' | 'openrouter' | 'cerebras' | 'openai';
  apiKey: string;
  baseURL?: string; // For OpenAI-compatible endpoints
  model?: string;
}

export async function generateVideoSpec(
  userPrompt: string,
  assets: Asset[],
  brandKit: BrandKit | undefined,
  config: AIProviderConfig
): Promise<ProjectSpec> {
  const systemPrompt = buildSystemPrompt(assets, brandKit);

  if (config.provider === 'claude') {
    const client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });

    const response = await client.messages.create({
      model: config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const jsonText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const spec = JSON.parse(jsonText);
    return validateProjectSpec(spec);

  } else {
    // OpenAI-compatible API (OpenRouter, Cerebras, OpenAI)
    const response = await fetch(config.baseURL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    const jsonText = data.choices[0].message.content;
    const spec = JSON.parse(jsonText);
    return validateProjectSpec(spec);
  }
}
```

### AI-Powered Features

Beyond video spec generation, integrate AI for:

1. **Auto-Captioning** (via Whisper API or Cerebras):
   - Extract audio from uploaded video
   - Send to Whisper/transcription API
   - Generate CaptionsPop clips with timing

2. **Scene Detection** (via Claude vision):
   - Extract keyframes from video
   - Send to Claude for scene analysis
   - Suggest clip split points

3. **Visual Effects Prompts** (via Claude):
   - "Make it more cinematic" → suggests color grading
   - "Add dramatic transitions" → inserts transition clips

Implementation:
```typescript
// /src/lib/ai/auto-caption.ts
export async function generateCaptions(
  audioBlob: Blob,
  config: AIProviderConfig
): Promise<Caption[]> {
  // Send to Whisper API or Cerebras
  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
    body: formData,
  });

  const { text, words } = await response.json();

  // Convert to Caption format
  return words.map(w => ({
    text: w.word,
    startTime: w.start,
    duration: w.end - w.start,
  }));
}
```

---

## Timeline Editor Architecture

### Component Structure

```
Editor Page
├── Toolbar (play/pause, export, settings)
├── Preview (Remotion Player + Diffusion Studio canvas)
├── Timeline
│   ├── TimeRuler
│   ├── Track (video)
│   │   └── Clip (draggable, trimmable)
│   ├── Track (overlay)
│   │   └── SkillClip (Remotion composition)
│   └── Track (audio)
│       └── Clip
└── Inspector (property editor)
```

### Preview Component

The preview uses a **composite rendering approach**:

```typescript
// /src/components/editor/Preview.tsx
import { Player } from '@remotion/player';
import { useDiffusionComposition } from '@/hooks/use-diffusion-composition';

export function Preview({ spec, currentTime }: PreviewProps) {
  const diffusionRef = useRef<HTMLCanvasElement>(null);
  const composition = useDiffusionComposition(spec);

  // Find active skill clips at current time
  const activeSkills = spec.composition.tracks
    .find(t => t.type === 'overlay')
    ?.clips.filter(c =>
      c.type === 'skill' &&
      currentTime >= c.startTime &&
      currentTime < c.startTime + c.duration
    ) || [];

  useEffect(() => {
    // Render base video/images/audio with Diffusion Studio
    composition.seek(currentTime);
    composition.renderToCanvas(diffusionRef.current);
  }, [currentTime]);

  return (
    <div className="preview-container">
      {/* Base layer: Diffusion Studio canvas */}
      <canvas ref={diffusionRef} width={1080} height={1920} />

      {/* Overlay layer: Remotion skills */}
      {activeSkills.map(clip => {
        const skillDef = SKILL_REGISTRY[clip.skillType!];
        const relativeTime = currentTime - clip.startTime;

        return (
          <div
            key={clip.id}
            className="skill-overlay"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            <Player
              component={skillDef.component}
              inputProps={clip.skillProps}
              durationInFrames={clip.duration * 30}
              fps={30}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: 1080, height: 1920 }}
              currentFrame={Math.floor(relativeTime * 30)}
              controls={false}
            />
          </div>
        );
      })}
    </div>
  );
}
```

### Timeline with Drag & Drop

```typescript
// /src/components/editor/Timeline.tsx
import { DndProvider, useDrag, useDrop } from 'react-dnd';

export function Timeline({ spec, onUpdate }: TimelineProps) {
  const pixelsPerSecond = 100; // Zoom level

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="timeline">
        <TimeRuler duration={spec.canvas.duration} pps={pixelsPerSecond} />

        {spec.composition.tracks.map(track => (
          <TimelineTrack
            key={track.id}
            track={track}
            pps={pixelsPerSecond}
            onClipMove={(clipId, newStart) => {
              // Update clip startTime in spec
              onUpdate(updateClipInSpec(spec, clipId, { startTime: newStart }));
            }}
          />
        ))}
      </div>
    </DndProvider>
  );
}

function TimelineClip({ clip, pps }: { clip: Clip; pps: number }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'CLIP',
    item: { clipId: clip.id, originalStart: clip.startTime },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div
      ref={drag}
      className="timeline-clip"
      style={{
        left: clip.startTime * pps,
        width: clip.duration * pps,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {getClipLabel(clip)}
    </div>
  );
}
```

### Inspector Panel

```typescript
// /src/components/editor/Inspector.tsx
export function Inspector({ selectedClip, onUpdate }: InspectorProps) {
  if (!selectedClip) return <EmptyState />;

  if (selectedClip.type === 'skill') {
    const skillDef = SKILL_REGISTRY[selectedClip.skillType!];

    return (
      <div className="inspector">
        <h3>{skillDef.name}</h3>

        {/* Dynamic form based on Zod schema */}
        <ZodForm
          schema={skillDef.propsSchema}
          values={selectedClip.skillProps}
          onChange={newProps => onUpdate({ skillProps: newProps })}
        />

        <Section title="Timing">
          <Input
            label="Start Time (s)"
            type="number"
            value={selectedClip.startTime}
            onChange={val => onUpdate({ startTime: parseFloat(val) })}
            step={0.1}
          />
          <Input
            label="Duration (s)"
            type="number"
            value={selectedClip.duration}
            onChange={val => onUpdate({ duration: parseFloat(val) })}
            step={0.1}
          />
        </Section>
      </div>
    );
  }

  return <MediaInspector clip={selectedClip} onUpdate={onUpdate} />;
}
```

---

## Export Strategy

### Browser-Based Remotion Rendering

The key technical challenge: rendering Remotion compositions to video clips in the browser.

**Approach: Canvas Capture + MediaRecorder**

```typescript
// /src/lib/export/remotion-renderer.ts
export async function renderRemotionSkill(
  composition: React.FC<any>,
  props: any,
  durationInFrames: number,
  fps: number
): Promise<Blob> {
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;

  // Create video stream
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000, // 5 Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.start();

  // Render each frame
  const root = createRoot(canvas);

  for (let frame = 0; frame < durationInFrames; frame++) {
    // Render Remotion composition to canvas
    root.render(
      <Composition
        component={composition}
        inputProps={props}
        width={1080}
        height={1920}
        fps={fps}
        durationInFrames={durationInFrames}
        currentFrame={frame}
      />
    );

    // Wait for frame to render
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  recorder.stop();
  root.unmount();

  return new Promise(resolve => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });
}
```

**Alternative: Use `@remotion/player` + Frame Capture**

```typescript
// Simpler but potentially lower quality
export async function renderSkillWithPlayer(
  composition: React.FC<any>,
  props: any,
  durationInFrames: number,
  fps: number
): Promise<Blob> {
  const playerRef = React.createRef<PlayerRef>();

  // Render player to hidden div
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <Player
      ref={playerRef}
      component={composition}
      inputProps={props}
      durationInFrames={durationInFrames}
      fps={fps}
      compositionWidth={1080}
      compositionHeight={1920}
      controls={false}
    />
  );

  // Capture frames
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 1080;
  canvas.height = 1920;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.start();

  for (let frame = 0; frame < durationInFrames; frame++) {
    playerRef.current?.seekTo(frame);
    await new Promise(resolve => setTimeout(resolve, 1000 / fps));

    // Capture player's canvas to our canvas
    const playerCanvas = container.querySelector('canvas');
    if (playerCanvas) {
      ctx.drawImage(playerCanvas, 0, 0);
    }
  }

  recorder.stop();
  root.unmount();
  document.body.removeChild(container);

  return new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });
}
```

### Final Composite Export with Diffusion Studio

```typescript
// /src/lib/export/encoder.ts
import * as core from '@diffusionstudio/core';

export async function exportVideo(
  spec: ProjectSpec,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Step 1: Render all Remotion skills to video clips
  const overlayTrack = spec.composition.tracks.find(t => t.type === 'overlay');
  const skillClips = overlayTrack?.clips.filter(c => c.type === 'skill') || [];

  const renderedSkills = new Map<string, Blob>();

  for (let i = 0; i < skillClips.length; i++) {
    const clip = skillClips[i];
    const skillDef = SKILL_REGISTRY[clip.skillType!];

    const blob = await renderRemotionSkill(
      skillDef.component,
      clip.skillProps,
      clip.duration * 30,
      30
    );

    renderedSkills.set(clip.id, blob);
    onProgress?.((i + 1) / (skillClips.length + 1) * 0.5); // 50% progress for rendering
  }

  // Step 2: Create Diffusion Studio composition
  const composition = new core.Composition();
  composition.width = spec.canvas.width;
  composition.height = spec.canvas.height;
  composition.fps = spec.canvas.fps;
  composition.duration = spec.canvas.duration;

  // Add video/audio/image tracks
  for (const track of spec.composition.tracks) {
    if (track.type === 'video') {
      const videoTrack = new core.VideoTrack();
      for (const clip of track.clips) {
        const asset = await loadAsset(clip.assetId!);
        const videoClip = new core.VideoClip({
          src: URL.createObjectURL(asset.blob),
          startTime: clip.startTime,
          duration: clip.duration,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
        });
        videoTrack.addClip(videoClip);
      }
      composition.addTrack(videoTrack);
    }

    if (track.type === 'audio') {
      const audioTrack = new core.AudioTrack();
      for (const clip of track.clips) {
        const asset = await loadAsset(clip.assetId!);
        const audioClip = new core.AudioClip({
          src: URL.createObjectURL(asset.blob),
          startTime: clip.startTime,
          duration: clip.duration,
        });
        audioTrack.addClip(audioClip);
      }
      composition.addTrack(audioTrack);
    }

    if (track.type === 'overlay') {
      const overlayTrack = new core.VideoTrack();
      for (const clip of track.clips) {
        if (clip.type === 'skill') {
          const blob = renderedSkills.get(clip.id)!;
          const skillClip = new core.VideoClip({
            src: URL.createObjectURL(blob),
            startTime: clip.startTime,
            duration: clip.duration,
          });
          overlayTrack.addClip(skillClip);
        }
      }
      composition.addTrack(overlayTrack);
    }
  }

  // Step 3: Render final video with WebCodecs
  const encoder = new core.VideoEncoder({
    format: 'webm',
    quality: 'high',
    fps: spec.canvas.fps,
    width: spec.canvas.width,
    height: spec.canvas.height,
  });

  const totalFrames = spec.canvas.duration * spec.canvas.fps;

  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / spec.canvas.fps;
    const imageData = await composition.renderFrame(time);
    await encoder.encodeFrame(imageData);

    onProgress?.(0.5 + (frame / totalFrames) * 0.5); // 50-100% progress
  }

  const blob = await encoder.finalize();
  return blob;
}
```

---

## Local Storage with IndexedDB

### Database Schema

```typescript
// /src/lib/storage/db.ts
import { openDB, DBSchema } from 'idb';

interface DraftCutDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string;
      spec: ProjectSpec;
      thumbnail?: string; // base64 or blob URL
      lastModified: number;
    };
  };
  assets: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      metadata: Asset;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

export async function getDB() {
  return openDB<DraftCutDB>('draftcut', 1, {
    upgrade(db) {
      db.createObjectStore('projects', { keyPath: 'id' });
      db.createObjectStore('assets', { keyPath: 'id' });
      db.createObjectStore('settings');
    },
  });
}
```

### Asset Management

```typescript
// /src/lib/storage/assets.ts
export async function saveAsset(file: File): Promise<Asset> {
  const db = await getDB();
  const id = generateId();

  const metadata: Asset = {
    id,
    type: detectAssetType(file.type),
    filename: file.name,
  };

  // Extract metadata
  if (metadata.type === 'video' || metadata.type === 'audio') {
    metadata.duration = await getMediaDuration(file);
  }

  if (metadata.type === 'video' || metadata.type === 'image') {
    const { width, height } = await getMediaDimensions(file);
    metadata.width = width;
    metadata.height = height;
  }

  await db.put('assets', { id, blob: file, metadata });
  return metadata;
}

async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(el.duration);
      URL.revokeObjectURL(el.src);
    };
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });
}
```

### API Key Storage

```typescript
// /src/lib/storage/api-keys.ts
export async function saveAPIKey(provider: string, key: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', key, `api-key-${provider}`);
}

export async function loadAPIKey(provider: string): Promise<string | null> {
  const db = await getDB();
  return (await db.get('settings', `api-key-${provider}`)) || null;
}

export async function clearAPIKey(provider: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', `api-key-${provider}`);
}
```

### Autosave

```typescript
// /src/hooks/use-autosave.ts
export function useAutosave(spec: ProjectSpec, interval = 30000) {
  useEffect(() => {
    const timer = setInterval(async () => {
      await saveProject(spec);
      toast.success('Project autosaved', { duration: 2000 });
    }, interval);

    return () => clearInterval(timer);
  }, [spec]);
}
```

---

## Directory Structure

```
/Users/dhonampemba/Development/seedworkers/DraftCut/
│
├── public/
│   ├── coi-serviceworker.js       # Cross-origin isolation
│   └── fonts/                      # Web fonts
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home (prompt + assets)
│   │   ├── editor/
│   │   │   └── page.tsx            # Editor screen
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── home/
│   │   │   ├── prompt-input.tsx
│   │   │   ├── asset-uploader.tsx
│   │   │   ├── brand-kit-form.tsx
│   │   │   └── ai-provider-selector.tsx
│   │   ├── editor/
│   │   │   ├── preview.tsx         # Remotion + Diffusion preview
│   │   │   ├── timeline.tsx
│   │   │   ├── timeline-track.tsx
│   │   │   ├── timeline-clip.tsx
│   │   │   ├── inspector.tsx
│   │   │   ├── toolbar.tsx
│   │   │   └── export-dialog.tsx
│   │   └── shared/
│   │
│   ├── skills/                     # Remotion skills
│   │   ├── remotion/
│   │   │   └── Root.tsx            # Remotion composition registry
│   │   ├── LowerThird.tsx
│   │   ├── CaptionsPop.tsx
│   │   ├── CalloutBoxArrow.tsx
│   │   ├── IntroTitleCard.tsx
│   │   ├── OutroCTA.tsx
│   │   └── registry.ts             # Skill definitions
│   │
│   ├── lib/
│   │   ├── spec/
│   │   │   ├── types.ts            # ProjectSpec types
│   │   │   ├── validator.ts        # Zod schemas
│   │   │   └── example.ts
│   │   ├── claude/
│   │   │   ├── client.ts           # Multi-provider AI client
│   │   │   └── prompt.ts
│   │   ├── ai/
│   │   │   ├── auto-caption.ts     # Whisper integration
│   │   │   └── scene-detect.ts
│   │   ├── engine/
│   │   │   ├── composition.ts      # Diffusion Studio wrapper
│   │   │   └── player.ts
│   │   ├── export/
│   │   │   ├── remotion-renderer.ts # Browser Remotion rendering
│   │   │   └── encoder.ts           # Final composite export
│   │   ├── storage/
│   │   │   ├── db.ts
│   │   │   ├── projects.ts
│   │   │   ├── assets.ts
│   │   │   └── api-keys.ts
│   │   └── utils/
│   │
│   ├── hooks/
│   │   ├── use-autosave.ts
│   │   ├── use-composition.ts
│   │   └── use-playback.ts
│   │
│   └── stores/
│       ├── project-store.ts        # Zustand store
│       └── editor-store.ts
│
├── examples/
│   ├── basic-project.json
│   └── prompts.md
│
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## Critical Files to Create First

1. **`/src/lib/spec/types.ts`** - Core data model (ProjectSpec, Clip, Track, Asset)
2. **`/src/skills/LowerThird.tsx`** - First Remotion skill to validate rendering approach
3. **`/src/lib/export/remotion-renderer.ts`** - Browser-based Remotion rendering (critical technical challenge)
4. **`/src/lib/claude/prompt.ts`** - System prompt for video generation
5. **`/src/components/editor/Preview.tsx`** - Composite preview (Diffusion + Remotion layers)

---

## Implementation Stages

### Stage 0: Scaffold (1-2 days)
- [ ] Initialize Next.js with TypeScript + Tailwind
- [ ] Install dependencies: `@diffusionstudio/core`, `remotion`, `@remotion/player`, `@anthropic-ai/sdk`, `zustand`, `idb`, `zod`, `react-dnd`
- [ ] Add shadcn/ui components
- [ ] Configure static export in `next.config.js`
- [ ] Add `coi-serviceworker.js` to `/public`
- [ ] Verify cross-origin isolation works

### Stage 1: Asset Upload (2 days)
- [ ] Create IndexedDB setup
- [ ] Build AssetUploader with drag-drop
- [ ] Build AssetList with previews
- [ ] Extract metadata (duration, dimensions)
- [ ] Test with video/audio/image files

### Stage 2: Define Spec (1 day)
- [ ] Create TypeScript types for ProjectSpec
- [ ] Create Zod validation schemas
- [ ] Create example project JSON
- [ ] Test validation with example

### Stage 3: First Remotion Skill (2 days)
- [ ] Implement LowerThird skill
- [ ] Create Remotion Root.tsx with composition registration
- [ ] Test skill rendering with `@remotion/player`
- [ ] Verify props system works

### Stage 4: Browser Remotion Rendering (3-4 days) ⚠️ **CRITICAL**
- [ ] Implement canvas capture approach
- [ ] Test rendering LowerThird to WebM blob
- [ ] Measure rendering speed (target: <2x realtime)
- [ ] Add progress tracking
- [ ] Fallback strategy if rendering fails

### Stage 5: Diffusion Studio Integration (2-3 days)
- [ ] Create composition wrapper for Diffusion Studio
- [ ] Load base video clip from assets
- [ ] Render to canvas
- [ ] Implement play/pause/seek
- [ ] Test with example video file

### Stage 6: Composite Preview (2 days)
- [ ] Build Preview component with layered rendering
- [ ] Diffusion Studio canvas for base layer
- [ ] Remotion Player overlays for skills
- [ ] Sync playback between both
- [ ] Test with video + LowerThird skill

### Stage 7: Implement All Skills (3-4 days)
- [ ] CaptionsPop
- [ ] CalloutBoxArrow
- [ ] IntroTitleCard
- [ ] OutroCTA
- [ ] Test each skill independently
- [ ] Create skill registry

### Stage 8: Timeline Editor (4-5 days)
- [ ] TimeRuler with markers
- [ ] TimelineTrack component
- [ ] TimelineClip with drag & drop
- [ ] Trim handles
- [ ] Playhead with scrubbing
- [ ] Test timeline interactions

### Stage 9: Inspector Panel (2 days)
- [ ] Build dynamic form from Zod schema
- [ ] Skill property editing
- [ ] Media clip properties
- [ ] Real-time preview updates
- [ ] Test with all skill types

### Stage 10: Claude Integration (3 days)
- [ ] Build AI provider selector (Claude/OpenRouter/Cerebras/OpenAI)
- [ ] Implement multi-provider client
- [ ] System prompt engineering
- [ ] Generate spec from prompt + assets
- [ ] Validation and error handling
- [ ] Test with diverse prompts

### Stage 11: Export (3-4 days)
- [ ] Render all Remotion skills to clips
- [ ] Composite with Diffusion Studio
- [ ] WebCodecs export to WebM
- [ ] Progress indicator
- [ ] Download to disk
- [ ] Test full export pipeline

### Stage 12: Auto-Caption Feature (2-3 days)
- [ ] Extract audio from video
- [ ] Integrate Whisper API
- [ ] Generate CaptionsPop clips
- [ ] Add to timeline automatically
- [ ] Test with various videos

### Stage 13: Project Persistence (2 days)
- [ ] Autosave to IndexedDB
- [ ] Project list screen
- [ ] Export/import project JSON
- [ ] Delete projects
- [ ] Test reload/restore

### Stage 14: UX Polish (3-4 days)
- [ ] Empty states
- [ ] Loading spinners
- [ ] Toast notifications
- [ ] Keyboard shortcuts
- [ ] Error boundaries
- [ ] Responsive design
- [ ] Test full user flow

**Total: ~35-45 days**

---

## Technical Risks & Mitigation

### Risk 1: Browser Remotion Rendering Performance ⚠️ **HIGH**

**Problem:** Rendering Remotion compositions frame-by-frame in the browser may be too slow or unreliable.

**Mitigation:**
1. **Prototype early** (Stage 4) - Validate approach before building rest of app
2. **Optimize rendering**: Use `requestIdleCallback`, Web Workers for encoding
3. **Fallback**: Pre-render common skills server-side, offer as templates
4. **User expectation**: Show progress bar, indicate rendering may take time
5. **Alternative**: Investigate experimental `@remotion/webcodecs` if it exists

**Success Metric:** Render a 5-second LowerThird in <10 seconds.

### Risk 2: Diffusion Studio API Assumptions

**Problem:** Plan assumes Diffusion Studio Core API supports our use case, but documentation may be incomplete.

**Mitigation:**
1. **Early testing** (Stage 5) - Build minimal Diffusion Studio example
2. **Community research**: Check GitHub issues, Discord for examples
3. **Fallback**: Use pure Canvas2D rendering if Diffusion Studio doesn't fit
4. **Vendor contact**: Reach out to Diffusion Studio team for guidance

**Success Metric:** Successfully composite video + overlay clip with Diffusion Studio.

### Risk 3: Cross-Origin Isolation on Static Hosts

**Problem:** Service worker approach may not work on all static hosts.

**Mitigation:**
1. **Primary deployment: Vercel** (known to work)
2. **Document requirements**: HTTPS + modern browser
3. **Fallback UI**: Show error message with setup instructions if `crossOriginIsolated === false`
4. **Alternative**: Provide Docker container for local hosting

**Success Metric:** App works on Vercel and localhost.

### Risk 4: Claude JSON Generation Quality

**Problem:** Claude may not reliably output valid JSON matching schema.

**Mitigation:**
1. **Prompt engineering**: Iterate on system prompt for 95%+ success rate
2. **Validation**: Zod validation with clear error messages
3. **Retry logic**: Automatically retry once on failure
4. **Manual fix UI**: Show generated JSON with inline editor
5. **Multi-provider support**: Test with GPT-4, Cerebras as alternatives

**Success Metric:** 90%+ success rate on diverse test prompts.

### Risk 5: Large File Memory Usage

**Problem:** Loading multiple large video files could crash browser.

**Mitigation:**
1. **Asset size limits**: Warn at 500MB total, block at 1GB
2. **Lazy loading**: Only load assets when needed
3. **Cleanup**: Revoke object URLs after use
4. **Compression**: Offer preview-quality transcoding option
5. **User guidance**: Document recommended file sizes

**Success Metric:** Handle 5 videos totaling 800MB without crash.

---

## Verification Approach

### Stage-by-Stage Validation

**Stage 0:**
- [ ] `npm run dev` starts successfully
- [ ] Check `window.crossOriginIsolated === true` in console

**Stage 1:**
- [ ] Upload video → IndexedDB stores blob
- [ ] Asset list shows thumbnail + metadata

**Stage 2:**
- [ ] Import example JSON → Zod validates successfully

**Stage 3:**
- [ ] LowerThird renders in @remotion/player
- [ ] Change props → preview updates

**Stage 4:** ⚠️ **CRITICAL VALIDATION**
- [ ] LowerThird renders to WebM blob
- [ ] Blob plays in <video> element
- [ ] Rendering completes in <10s for 5s skill
- [ ] No memory leaks after multiple renders

**Stage 5:**
- [ ] Video plays in Diffusion Studio canvas
- [ ] Seek works

**Stage 6:**
- [ ] Video + LowerThird overlay preview in sync
- [ ] Scrubbing updates both layers

**Stage 10:**
- [ ] Prompt "20s promo with intro and outro" → valid spec
- [ ] Spec loads into editor

**Stage 11:**
- [ ] Export 15s video with 2 skills
- [ ] Downloaded file plays in VLC
- [ ] Skills visible in export

**Stage 12:**
- [ ] Upload video with speech → auto-captions generated
- [ ] Captions synced to audio

---

## Testing Strategy

### Manual Test Checklist

- [ ] Upload 3 videos, 2 images, 1 audio file
- [ ] Generate draft with prompt: "Make a 20s promo with intro title, captions, and CTA"
- [ ] Edit LowerThird text in inspector → preview updates
- [ ] Drag clip on timeline → preview updates
- [ ] Trim clip edge → duration changes
- [ ] Export to WebM → file downloads and plays
- [ ] Refresh page → project restores from IndexedDB
- [ ] Test on Chrome, Firefox, Safari Technology Preview
- [ ] Test with 800MB total assets
- [ ] Test with 50-clip timeline

### Performance Benchmarks

- Timeline render time (100 clips): <100ms
- Playback frame rate: 30 FPS
- Remotion skill render time (5s): <10s
- Export speed (30s video): <2 minutes

---

## Deployment

### Build Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
};

module.exports = nextConfig;
```

### Deployment Steps (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Configure:
   - Build command: `npm run build`
   - Output directory: `out`
4. Deploy
5. Verify `crossOriginIsolated` works

### Environment Variables

None required (all API keys stored client-side in IndexedDB).

### Custom Domain

- Add CNAME record pointing to Vercel
- HTTPS automatically provisioned

---

## Success Criteria

The plan is successfully implemented when:

1. ✅ User can upload video + prompt "make a 20s promo" → Claude generates spec
2. ✅ Generated spec opens in editor with timeline showing clips
3. ✅ All 5 Remotion skills render correctly in preview
4. ✅ User can edit skill properties in inspector → preview updates in real-time
5. ✅ User can drag/trim clips on timeline
6. ✅ Export produces downloadable WebM file with all skills rendered
7. ✅ Project autosaves and restores on page refresh
8. ✅ App works entirely in browser (no backend)
9. ✅ Cross-origin isolation works on Vercel deployment
10. ✅ API key stored securely in IndexedDB (never sent to server)

---

## Open Questions

1. **Remotion browser rendering**: Is there an official/experimental browser renderer we can use, or should we proceed with canvas capture?

2. **Diffusion Studio compositing**: Does Diffusion Studio Core support adding pre-rendered video clips as overlays, or do we need a different integration pattern?

3. **WebM vs MP4 priority**: Should we invest time in MP4 export for MVP, or is WebM sufficient for social media platforms in 2026?

4. **AI auto-captioning budget**: How much should we budget for Whisper API calls? Should we offer local Whisper.cpp as an option?

These questions should be resolved during early prototyping (Stages 3-5).
