```text
You are Claude Code acting as a senior full-stack engineer + product-minded architect. Build a “prompt → draft → editable timeline” local-first video editor that runs entirely in the browser (no backend). Use Next.js + TypeScript for the app shell/UI, Diffusion Studio Core for timeline playback/compositing/export, and a small library of “skills” (motion graphic overlays inspired by Remotion skills) that can be placed on the timeline as editable overlay clips.

GOALS (must-have)
1) Local-first web app: no backend required.
2) First screen (Lovable-style):
   - Big prompt text area
   - Asset uploader (images/videos/audio)
   - Optional “Brand kit” inputs: logo, primary font name, primary/secondary colors
   - “Claude API Key (BYOK)” input stored locally
   - Button: “Generate draft”
3) “Generate draft” calls Claude API from the browser using the user’s key.
   - Send: prompt + lightweight metadata about uploaded assets (type, duration, resolution, filename) WITHOUT uploading media.
   - Receive: a structured JSON “Video Project Spec” describing scenes, tracks, clips, overlays, and skill instances.
4) After generation, open a CapCut/iMovie-like editor screen:
   - Timeline with multiple tracks (Video, Overlays, Audio)
   - Preview player with play/pause, scrubbing, current timecode
   - Inspector panel to edit selected clip properties (text, position, size, start/end, colors)
   - Drag to move clips, trim clip edges, reorder, split
5) Render/export locally to MP4 (or WebM if MP4 is hard at first) using browser APIs. Prefer WebCodecs if available; provide a fallback export path if needed.
6) Local save/load:
   - Autosave project spec + asset references to IndexedDB
   - Export project to a .json file (and optionally a .zip with assets)
   - Import a saved project

TECH STACK
- Next.js (latest stable) + React + TypeScript
- Tailwind + shadcn/ui for UI
- State: Zustand (or equivalent)
- Diffusion Studio Core as the timeline playback/compositing engine
- WebCodecs for encode/decode where possible
- IndexedDB via idb-keyval or similar
- No server. App should be deployable as static output.

IMPORTANT BROWSER HEADERS
Diffusion Studio requires cross-origin isolation. Configure hosting/headers for:
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: credentialless
Implement this in Next.js (middleware/headers config) and document it in README.

“SKILLS” (motion overlays inspired by Remotion skills)
Implement at least 5 overlay skill types as reusable components that can be instantiated from the Project Spec:
1) LowerThird: animated name/title bar
2) CaptionsPop: timed captions with word emphasis
3) CalloutBoxArrow: highlight rectangle + arrow pointing to an (x,y) region
4) IntroTitleCard: animated title + subtitle + logo
5) OutroCTA: animated CTA with logo + URL
Skills must:
- Be parameterized (props)
- Render in the preview and export
- Be editable in inspector (text, colors, position)
- Support basic enter/exit animations (fade/slide/scale) controlled by timing

PROJECT SPEC (define this carefully)
Create a versioned schema, e.g.:
- version
- canvas: width, height, fps, duration
- assets: list of uploaded assets with local object URLs or IndexedDB keys
- tracks: array of tracks
- clips: each clip has id, trackId, type (video/audio/skill), startTime, duration, trimStart, trimEnd, assetRef, skillType, props
- captions: optional structured captions track
Make sure it is future-proof and easy for Claude to output.

CLAUDE PLANNING PROMPT (you must implement in code)
In the app, when calling Claude, use a system/developer prompt that forces valid JSON output matching the spec.
- No commentary, JSON only.
- Include constraints: max duration default 15–30s, social-friendly pacing.
- Use assets provided (choose the best video as base layer if present).
- If no video assets, create a slideshow from images with transitions.
- Always include Intro + Main + Outro scenes unless prompt says otherwise.

UX DETAILS
- Default canvas preset: 1080x1920 (9:16) with a selector for 16:9 and 1:1.
- Provide template buttons: “Product demo”, “Webinar clip”, “Slide-to-video”.
- Provide a “Regenerate draft” button that keeps user edits optional (ask whether to overwrite or add as new version—if overwrite is hard, create a new version ID).

EDITOR REQUIREMENTS (MVP)
- Timeline:
  - Horizontal time ruler
  - Clip blocks per track
  - Drag to move
  - Drag edges to trim
  - Snap to playhead optional
- Preview:
  - Scrub works smoothly
  - Shows overlays on top of base video
- Inspector:
  - Edit text fields for skills
  - Position (x,y), scale, opacity
  - Colors (primary/secondary)
  - Timing (start/duration)
- Export:
  - “Export video” button
  - Progress indicator
  - Save file to disk

SECURITY / BYOK
- Store Claude API key ONLY in localStorage or IndexedDB (prefer IndexedDB).
- Never log it.
- Provide “Forget key” button.
- Clear warning text: “Your key stays on your device; API calls go directly from your browser.”

DELIVERABLES
1) Working Next.js repo with:
   - /app (UI pages)
   - /editor (timeline + preview + inspector)
   - /engine (Diffusion integration)
   - /skills (overlay skill implementations)
   - /spec (schema + validator + types)
2) README with:
   - Setup instructions
   - Required headers (COOP/COEP) and how to deploy
   - How BYOK works
3) Example prompts and a demo project spec JSON in /examples

IMPLEMENTATION PLAN (follow step-by-step and commit each stage)
Stage 0: Scaffold repo, Tailwind/shadcn, routing (Home → Editor)
Stage 1: Asset upload + local asset registry + preview list
Stage 2: Define Project Spec types + validator + example project
Stage 3: Editor MVP with timeline UI and preview of a static example spec (no Claude yet)
Stage 4: Integrate Diffusion Studio Core playback/compositing with base video + one overlay
Stage 5: Implement 5 skills + inspector editing + timeline manipulation
Stage 6: Claude API integration to generate spec from prompt + asset metadata
Stage 7: Local export (WebCodecs-first, fallback if needed)
Stage 8: Autosave + import/export project
Stage 9: Polish UX, error handling, empty states

ACCEPTANCE TESTS
- With one uploaded Loom video: prompt “make a 20s promo with captions + callouts + logo outro” → generates draft spec → opens editor → captions visible → user edits caption text → exports video.
- With only images: prompt “make a 15s slideshow with upbeat titles and CTA” → generates slideshow spec → editor works → export works.
- Key persistence: refresh page retains key unless user clicks “Forget key”.
- Project persistence: refresh page restores last project from IndexedDB.

CONSTRAINTS
- Keep dependencies minimal.
- Prefer readable, well-typed TS.
- Do not build a backend.
- Do not upload media to any server.
- If any part is too hard (e.g., MP4 export), implement WebM export first, but architect it so MP4 can be added.

Now start by scaffolding the repo and implementing Stage 0. As you go, narrate briefly what you are doing and run the dev server to verify each stage works.
```

