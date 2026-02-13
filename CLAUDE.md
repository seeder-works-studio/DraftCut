# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DraftCut is an AI-powered video editor that runs entirely in the browser. Users describe a video concept, upload assets (images/videos/audio), and AI generates a structured video specification that gets rendered using Remotion. All data is stored locally in IndexedDB—nothing is sent to any server except for AI generation requests.

### Additional Documentation
- **[AGENTIC-VIDEO-SYSTEM.md](./AGENTIC-VIDEO-SYSTEM.md)** - AI-powered iterative video refinement system (chat-based editing)
- **[TESTING-EXPORT.md](./TESTING-EXPORT.md)** - Export functionality testing guide
- **[API-KEYS.md](./API-KEYS.md)** - API key configuration for all providers
- **[DIFFUSION-STUDIOS-INTEGRATION.md](./DIFFUSION-STUDIOS-INTEGRATION.md)** - MP4 export integration (in development)

## Core Architecture

### Tech Stack
- **Framework**: Next.js 16 with static export (`output: 'export'`)
- **Deployment**: Cloudflare Workers (via Wrangler) with static assets
- **State Management**: Zustand stores (project, editor, chat)
- **Local Storage**: IndexedDB via `idb` library
- **Video Rendering**: Remotion 4 for composition, browser MediaRecorder for skill rendering
- **AI Integration**: Multiple providers (Claude, Gemini, OpenAI, OpenRouter, Cerebras)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components, Radix UI primitives

### Application Flow
1. **Home Page** (`/`): User uploads assets, enters prompt, configures AI provider and media services
2. **AI Generation**: System calls AI provider with structured prompt to generate `ProjectSpec` JSON
3. **Editor Page** (`/editor`): Timeline-based editor for reviewing and refining the generated video
4. **Export**: Browser-based rendering to WebM using canvas capture and MediaRecorder

### Key Data Structures

**ProjectSpec** (`src/lib/spec/types.ts`): The central data model for a video project
- `canvas`: Dimensions, FPS, duration, background color
- `assets`: Array of uploaded media files (video/audio/image)
- `composition.tracks`: Array of tracks containing clips
- `brandKit`: Optional logo, fonts, and colors

**Clip** (`src/lib/spec/types.ts`): Represents a piece of content on the timeline
- Regular clips reference an `assetId` (media file)
- Skill clips have `skillType` and `skillProps` (e.g., "LowerThird", "IntroTitleCard")
- **IMPORTANT**: Static image clips are deprecated - use ImageSlideshow skill instead

**Skills**: Remotion-based video effects/overlays in `src/skills/`
- Each skill is a React component with built-in animations using spring() and interpolate()
- All skills registered in `src/skills/registry.ts`
- Animation primitives library in `src/lib/animations/primitives.ts`
- Skills: LowerThird, CaptionsPop, CalloutBoxArrow, IntroTitleCard, OutroCTA, ImageSlideshow, TextReveal

### State Management (Zustand Stores)

**project-store** (`src/stores/project-store.ts`): Current project and assets
- `spec: ProjectSpec | null` - Active video specification
- `assets: Asset[]` - Uploaded media metadata
- `assetBlobUrls` - Maps asset IDs to blob URLs for playback

**editor-store** (`src/stores/editor-store.ts`): Playback and timeline UI state
- `currentTime` - Playhead position in seconds
- `isPlaying` - Playback state
- `selectedClipId` - Currently selected clip for inspector
- `pixelsPerSecond` - Timeline zoom level

**chat-store** (`src/stores/chat-store.ts`): AI chat interface in editor
- Messages for iterating on the video with AI
- Enables agentic video refinement—AI analyzes current video and suggests improvements
- See [AGENTIC-VIDEO-SYSTEM.md](./AGENTIC-VIDEO-SYSTEM.md) for detailed documentation

### Storage Layer (`src/lib/storage/`)

All data persists in IndexedDB (`draftcut` database):
- **projects** store: Saved video projects with thumbnails
- **assets** store: Media file blobs with metadata
- **settings** store: API keys (prefixed with `api-key-{provider}`)

Key files:
- `db.ts` - Database schema and connection
- `projects.ts` - Project CRUD operations
- `assets.ts` - Asset blob management
- `api-keys.ts` - API key storage/retrieval

### AI Integration (`src/lib/claude/` and `src/lib/ai/`)

**Video Generation** (`src/lib/claude/client.ts`):
- `generateVideoSpec()` sends user prompt + assets + brand kit to AI provider
- System prompt (`prompt.ts`) instructs AI to return valid ProjectSpec JSON
- Supports multiple providers via OpenAI-compatible API or native Anthropic SDK

**Media Services** (`src/lib/ai/`):
- `music.ts` - Replicate/FAL for AI music generation
- `beatoven.ts` - Beatoven.ai for custom music composition
- `auto-caption.ts` - ElevenLabs for voice narration
- `website.ts` - Scraping websites for brand kit (via Cloudflare Worker proxy)

### Cloudflare Worker (`worker/index.ts`)

Handles API routes since Next.js static export doesn't support API routes:
- `/api/scrape` - Website scraper for extracting brand info (title, images, colors)
- `/api/proxy-image` - CORS proxy for fetching external images

Static assets served from `./out` directory with SPA fallback routing.

## Environment Setup

### Prerequisites
- Node.js 18+ (for development)
- Modern browser (Chrome, Edge, or Safari for WebM export support)
- API keys for at least one AI provider (see [API-KEYS.md](./API-KEYS.md))

### Configuration
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` (if it exists) and add your API keys:
   - `CLAUDE_API_KEY` - Anthropic API key
   - `GEMINI_API_KEY` - Google Gemini API key
   - Or other provider keys as needed
3. For E2E tests, API keys are loaded from `.env` into IndexedDB during test setup

## Development Commands

```bash
# Development server (localhost:3000)
npm run dev

# Production build (outputs to ./out)
npm run build

# Serve production build locally
npm run start

# Lint code
npm run lint

# Deploy to Cloudflare Workers
npm run deploy

# Run E2E tests with Playwright
npx playwright test

# Run specific E2E test
npx playwright test e2e/generate-demo.spec.ts

# Playwright headed mode (see browser)
npx playwright test --headed

# Playwright debug mode
npx playwright test --debug
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Home page (prompt input + asset upload)
│   └── editor/page.tsx    # Editor page (timeline + preview + chat)
│
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── home/              # Landing page components
│   │   ├── prompt-input.tsx
│   │   ├── asset-uploader.tsx
│   │   ├── settings-dialog.tsx      # AI provider + media services config
│   │   ├── ai-provider-selector.tsx
│   │   └── brand-kit-form.tsx
│   └── editor/            # Editor page components
│       ├── preview.tsx    # Remotion Player for video preview
│       ├── timeline.tsx   # Track and clip timeline with drag-drop
│       ├── inspector.tsx  # Clip property editor
│       ├── chat-panel.tsx # AI chat for iterating on video
│       ├── toolbar.tsx    # Top toolbar (export, back)
│       └── export-dialog.tsx
│
├── stores/                # Zustand state stores
│   ├── project-store.ts   # Active project and assets
│   ├── editor-store.ts    # Playback and timeline state
│   └── chat-store.ts      # Chat messages
│
├── lib/
│   ├── spec/              # ProjectSpec type definitions and validation
│   │   ├── types.ts       # Core data structures
│   │   ├── validator.ts   # Zod schema validation
│   │   └── example.ts     # Example spec for AI prompt
│   ├── claude/            # AI generation logic
│   │   ├── client.ts      # generateVideoSpec() - main entry point
│   │   ├── prompt.ts      # System prompt builder
│   │   └── chat.ts        # Chat iteration logic
│   ├── ai/                # Media service integrations
│   ├── storage/           # IndexedDB operations
│   └── export/            # Video export/rendering
│       ├── remotion-renderer.ts  # Browser-based skill rendering
│       └── encoder.ts            # Video encoding utilities
│
├── skills/                # Remotion video effect components
│   ├── registry.ts        # Skill registration and lookup
│   ├── remotion/Root.tsx  # Remotion root composition
│   └── *.tsx              # Individual skill components
│
└── hooks/                 # React hooks
    ├── use-autosave.ts    # Auto-save to IndexedDB
    ├── use-playback.ts    # Video playback controls
    └── use-asset-loader.ts # Load assets from IndexedDB into blob URLs

worker/
└── index.ts               # Cloudflare Worker for API routes

e2e/
└── generate-demo.spec.ts  # End-to-end Playwright test
```

## Important Technical Details

### API Key Storage
- All API keys stored in IndexedDB under `settings` store
- Key format: `api-key-{provider}` (e.g., `api-key-claude`, `api-key-gemini`)
- Keys never leave the browser except to call respective APIs
- See `API-KEYS.md` for provider documentation

### Asset Management
- Assets stored as Blobs in IndexedDB
- Blob URLs created on load for playback (`URL.createObjectURL`)
- Blob URLs must be revoked on cleanup (`URL.revokeObjectURL`)
- Asset IDs referenced in clips via `assetId` field

### Remotion Integration
- Remotion Player used for preview in editor
- Skills rendered frame-by-frame using canvas capture (browser-based, no Node.js)
- Regular media clips use native HTML5 video/audio elements
- Root composition in `src/skills/remotion/Root.tsx`

### Timeline & Clips
- Timeline uses react-dnd for drag-and-drop clip reordering
- Clips positioned by `startTime` and `duration` (in seconds)
- Supports video, audio, image, and skill clip types
- Each clip can have transforms (position, scale, opacity) and transitions

### Video Export
- Export renders to WebM (VP9) using MediaRecorder API
- Skill rendering: Frame-by-frame canvas capture
- Timeline sequencing: Composite all tracks with proper timing
- No server-side rendering—fully client-side

### Cloudflare Deployment
- Static export (`next build` generates `./out` directory)
- Worker serves static files and handles `/api/*` routes
- `wrangler.jsonc` configures deployment
- SPA fallback routing for client-side navigation

## Testing

E2E tests use Playwright with the dev server:
- Tests interact with real UI flow (upload → prompt → generate → editor)
- API keys loaded from `.env` file and seeded into IndexedDB
- Screenshots captured for visual verification
- Test timeout: 120s (allows for AI generation latency)

### Running Tests
```bash
# All tests
npx playwright test

# Specific test file
npx playwright test e2e/generate-demo.spec.ts

# With browser UI
npx playwright test --headed

# Debug mode (step through test)
npx playwright test --debug
```

See [TESTING-EXPORT.md](./TESTING-EXPORT.md) for comprehensive export testing procedures.

## Debugging & Common Issues

### Remotion Rendering Issues
- **Canvas capture failing**: Check browser console for security errors. Some localhost setups may require HTTPS for canvas access in certain environments.
- **Skills not rendering**: Verify skill is registered in `src/skills/registry.ts` and component exports correctly
- **Timeline duration mismatch**: Ensure all clips have `startTime` and `duration` set (in seconds), and check `canvas.duration` matches the composition length

### IndexedDB Issues
- **Storage quota exceeded**: User's browser IndexedDB quota is full. Suggest clearing old projects or using a different browser profile
- **Blob URL revocation**: Watch for "blob URL revoked" errors—ensure `URL.revokeObjectURL()` isn't called before playback completes. Use `useAssetLoader` hook for proper blob URL lifecycle management
- **Cross-origin asset loading**: Remote images must have proper CORS headers. Use `/api/proxy-image` worker endpoint for CORS issues

### Asset Management
- **Missing assets in timeline**: Check that `assetId` in clips matches asset IDs in the project store
- **Audio not playing**: Audio tracks render but don't export yet—see roadmap. For preview, check audio codec compatibility
- **Large file performance**: Video files over 500MB may cause browser slowdown. Consider recommending MP4 compression to users

### State Management
- **Stale UI after spec update**: Zustand stores may not re-render if updater function mutates instead of creating new object. Always use spread operator: `...spec` not direct mutation
- **Lost changes on browser back**: Use `useAutosave` hook to persist to IndexedDB. Check that auto-save interval is appropriate for the machine

### Export Functionality
- **WebM export incomplete**: See [TESTING-EXPORT.md](./TESTING-EXPORT.md) for detailed testing procedures
- **Skills not rendering in export**: Only ImageSlideshow skill fully exports to WebM. Other skills render as placeholders. MP4 export with Diffusion Studios will support full skill rendering
- **Audio missing in export**: Audio mixing not yet implemented (roadmap item). Export currently includes video track only

## Media Services Configuration

### Implemented Services
- **Music Generation**: Beatoven.ai and Replicate (FAL) - Fully integrated, can be triggered via AI prompt
- **Website Scraping**: Cloudflare Worker proxy for extracting brand kits from URLs—fully working
- **Voice Narration**: ElevenLabs integration exists but not exposed in UI (roadmap)

### Partially Implemented
- **Auto-captions**: ElevenLabs integration framework in place, awaiting full implementation
- **MP4 Export**: Diffusion Studios SDK integrated, MP4 export in progress (see DIFFUSION-STUDIOS-INTEGRATION.md)

### Adding a New Media Service
1. Create service client in `src/lib/ai/{service}.ts` with configuration type
2. Add API key storage via `src/lib/storage/api-keys.ts`
3. Add UI controls in `src/components/home/media-services-config.tsx` if user-facing
4. Integrate into generation flow: either call directly in `src/lib/claude/client.ts` or include in system prompt for AI to orchestrate
5. Document API key requirements in [API-KEYS.md](./API-KEYS.md)

## Agentic Video Refinement System

DraftCut includes an iterative AI refinement system (like Claude Code for videos) that allows users to improve their generated videos through chat in the editor.

### How It Works
1. After video generation, user can chat with AI in the editor
2. AI analyzes the current video spec and provides suggestions for improvement
3. User describes desired changes (e.g., "Make the intro longer", "Add more Ken Burns effects")
4. AI generates updated ProjectSpec JSON based on feedback
5. Editor preview updates in real-time
6. Process repeats until user is satisfied

### Key Components
- **chat-store** (`src/stores/chat-store.ts`): Maintains conversation history
- **Chat Panel** (`src/components/editor/chat-panel.tsx`): UI for sending messages and viewing responses
- **AI Analysis** (`src/lib/claude/chat.ts`): Analyzes current spec and generates improvements

### Important Notes
- Agentic refinement currently supports Claude provider—OpenRouter and other providers via OpenAI-compatible API also supported
- Version history for tracking iterations is on the roadmap
- Each refinement generates a new complete ProjectSpec (full rewrite, not incremental patches)

See [AGENTIC-VIDEO-SYSTEM.md](./AGENTIC-VIDEO-SYSTEM.md) for complete system documentation.

## Adding New Features

### Adding a New Skill
1. Create skill component in `src/skills/{SkillName}.tsx`
2. Define props interface extending `SkillProps`
3. Register in `src/skills/registry.ts` with metadata
4. Add skill type to `SkillType` union in `src/lib/spec/types.ts`
5. Update AI prompt in `src/lib/claude/prompt.ts` to include new skill

### Adding a New AI Provider
1. Add provider to `AIProvider` type in `src/components/home/ai-provider-selector.tsx`
2. Add API key input field in settings dialog
3. Handle provider in `generateVideoSpec()` in `src/lib/claude/client.ts`
4. Update `API-KEYS.md` with provider documentation

### Adding a New Media Service
1. Create service client in `src/lib/ai/{service}.ts`
2. Add to `MediaServiceConfig` in `src/components/home/media-services-config.tsx`
3. Store API key in IndexedDB via `src/lib/storage/api-keys.ts`
4. Integrate into generation flow in `src/lib/claude/client.ts` or prompt

## Common Patterns

### Updating the Project Spec
```typescript
import { useProjectStore } from '@/stores/project-store';

const updateSpec = useProjectStore((s) => s.updateSpec);

// Use updater function for immutable updates
updateSpec((spec) => ({
  ...spec,
  canvas: { ...spec.canvas, duration: 60 },
}));
```

### Storing Data in IndexedDB
```typescript
import { getDB } from '@/lib/storage/db';

const db = await getDB();
await db.put('settings', value, 'api-key-gemini');
const key = await db.get('settings', 'api-key-gemini');
```

### Adding Assets to Project
```typescript
import { useProjectStore } from '@/stores/project-store';
import { saveAssetToIndexedDB } from '@/lib/storage/assets';

const addAsset = useProjectStore((s) => s.addAsset);

// Save blob and metadata
const assetId = await saveAssetToIndexedDB(blob, metadata);
addAsset(metadata);
```
