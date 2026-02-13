# System Architecture - Visual Guide

## Full System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DRAFTCUT VIDEO EDITOR                           │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │   Chat Panel     │  │   Preview Panel      │  │   Timeline       │ │
│  │   (400px left)   │  │   (top right)        │  │   (bottom right) │ │
│  └────────┬─────────┘  └──────────┬───────────┘  └────────┬─────────┘ │
│           │                       │                      │             │
│           └───────────┬───────────┴──────────┬───────────┘             │
│                       │                      │                         │
│                       ▼                      ▼                         │
│         ┌────────────────────────────────────────┐                    │
│         │    Zustand Project Store               │                    │
│         ├────────────────────────────────────────┤                    │
│         │ - spec: ProjectSpec                    │                    │
│         │ - assets: Asset[]                      │                    │
│         │ - setSpec(spec)                        │                    │
│         │ - updateSpec(updater)                  │                    │
│         └────────────┬─────────────────────────┘                     │
│                      │                                                │
│                      ▼                                                │
│         ┌────────────────────────────────────────┐                    │
│         │  IndexedDB Storage                     │                    │
│         ├────────────────────────────────────────┤                    │
│         │ - projects (saved videos)              │                    │
│         │ - assets (media blobs)                 │                    │
│         │ - settings (API keys, preferences)     │                    │
│         └────────────────────────────────────────┘                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Chat Editing Flow (Detailed)

```
┌─────────────────┐
│  User Types     │
│  Chat Message   │
│  "Change the    │
│   title to      │
│   'New Title'"  │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│  ChatPanel.handleSend()      │
│  (chat-panel.tsx:105)        │
└──────────┬───────────────────┘
           │
           ├─ Validate input
           ├─ Check API key exists
           ├─ Add user message to chat
           └─ Call chatEditSpec()
                │
                ▼
┌──────────────────────────────────────────┐
│  chatEditSpec()                          │
│  (chat.ts:97)                           │
└──────────┬───────────────────────────────┘
           │
           ├─ Build system prompt
           │  ├─ Base generation rules
           │  ├─ Current ProjectSpec JSON
           │  └─ Instructions for response
           │
           ├─ Collect message history
           │  ├─ User messages
           │  ├─ Assistant messages
           │  └─ Exclude welcome message
           │
           └─ Send to AI Provider
              │
              ▼
     ┌─────────────────────────────────┐
     │  AI Provider (Claude/OpenAI)    │
     │                                 │
     │  Processes:                     │
     │  - System prompt                │
     │  - Current spec                 │
     │  - Chat history                 │
     │  - User request                 │
     │                                 │
     │  Returns: Modified spec + text  │
     └────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│  parseResponse()                         │
│  (chat.ts:54)                           │
│                                          │
│  Extract JSON from ```json...``` block  │
└──────────┬───────────────────────────────┘
           │
           ▼ (if JSON found)
┌──────────────────────────────────────────┐
│  validateProjectSpec()                   │
│  (Zod schema validation)                 │
│                                          │
│  Checks:                                 │
│  ✓ canvas exists                         │
│  ✓ composition exists                    │
│  ✓ assets array                          │
│  ✓ all clips valid                       │
│  ✓ timing constraints                    │
└──────────┬───────────────────────────────┘
           │
           ├─ Valid?
           │   │
           │   ▼ YES
           │   ┌──────────────────┐
           │   │ Return spec      │
           │   └────────┬─────────┘
           │            │
           │            ▼
           │   ┌──────────────────────────────────────┐
           │   │ ChatPanel.handleSend() receives      │
           │   │ result with updated spec            │
           │   └────────┬─────────────────────────────┘
           │            │
           │            ├─ Add assistant message
           │            ├─ setSpec(result.spec)
           │            └─ Mark with specJson: true
           │                    │
           │                    ▼
           │            ┌──────────────────────────┐
           │            │ Zustand updates:         │
           │            │ project-store.spec       │
           │            │ project-store.setSpec()  │
           │            └────────┬─────────────────┘
           │                     │
           │                     ▼
           │            ┌──────────────────────────┐
           │            │ Preview detects change   │
           │            │ via useProjectStore      │
           │            └────────┬─────────────────┘
           │                     │
           │                     ▼
           │            ┌──────────────────────────┐
           │            │ Remotion Re-renders      │
           │            │ - All tracks             │
           │            │ - All clips              │
           │            │ - All skills             │
           │            │ - Updated timing         │
           │            │ - New text/colors        │
           │            └────────┬─────────────────┘
           │                     │
           │                     ▼
           │            ┌──────────────────────────┐
           │            │ User sees updated video  │
           │            │ in preview               │
           │            │ "Video updated" badge    │
           │            └──────────────────────────┘
           │
           └─ Invalid?
               │
               ▼ NO
        ┌────────────────────────┐
        │ Return error message   │
        │ spec: null             │
        │ displayText: error     │
        └────────────────────────┘
```

## Component Data Flow

```
Editor Page (editor/page.tsx)
│
├─→ Toolbar (export, back buttons)
│
├─→ Chat Panel
│   ├─ Reads: useChatStore (messages, config)
│   ├─ Reads: useProjectStore (spec, assets)
│   ├─ Writes: useChatStore.addMessage()
│   ├─ Writes: useProjectStore.setSpec()
│   ├─ Calls: chatEditSpec() on send
│   └─ Shows: "Video updated" badge on spec change
│
├─→ Preview
│   ├─ Reads: useProjectStore (spec, assets)
│   ├─ Reads: useEditorStore (currentTime, isPlaying)
│   ├─ Uses: Remotion Player
│   ├─ Re-renders: When spec changes
│   └─ Shows: Real-time video with all updates
│
└─→ Timeline
    ├─ Reads: useProjectStore (spec)
    ├─ Reads: useEditorStore (selectedClipId)
    ├─ Writes: useEditorStore (selectedClipId, currentTime)
    ├─ Supports: Drag-drop reordering
    └─ Shows: Visual representation of all clips
```

## State Management

```
┌─────────────────────────────────────┐
│      Zustand Stores                 │
├─────────────────────────────────────┤
│                                     │
│  project-store.ts                  │
│  ├─ spec: ProjectSpec | null       │
│  ├─ assets: Asset[]                │
│  ├─ setSpec(spec)                  │
│  ├─ updateSpec(updater)            │
│  ├─ addAsset(asset)                │
│  └─ loadProject(id)                │
│                                     │
│  chat-store.ts                     │
│  ├─ messages: ChatMessage[]        │
│  ├─ isGenerating: boolean          │
│  ├─ aiConfig: AIProviderConfig     │
│  ├─ addMessage(msg)                │
│  ├─ setIsGenerating(bool)          │
│  └─ setAiConfig(config)            │
│                                     │
│  editor-store.ts                   │
│  ├─ currentTime: number            │
│  ├─ isPlaying: boolean             │
│  ├─ selectedClipId: string | null  │
│  ├─ pixelsPerSecond: number        │
│  ├─ setCurrentTime(time)           │
│  └─ setSelectedClipId(id)          │
│                                     │
└─────────────────────────────────────┘
        │
        │ Persisted to IndexedDB
        │
        ▼
┌─────────────────────────────────────┐
│    IndexedDB Storage                │
├─────────────────────────────────────┤
│                                     │
│  database: 'draftcut'              │
│  ├─ store: 'projects'              │
│  │  └─ [projectId]: ProjectData    │
│  │     ├─ spec: ProjectSpec        │
│  │     ├─ thumbnail: Blob          │
│  │     └─ metadata: {...}          │
│  │                                 │
│  ├─ store: 'assets'                │
│  │  └─ [assetId]: AssetData        │
│  │     ├─ blob: Blob               │
│  │     ├─ filename: string         │
│  │     └─ type: 'video'|'audio'... │
│  │                                 │
│  └─ store: 'settings'              │
│     ├─ 'api-key-claude': string    │
│     ├─ 'api-key-openai': string    │
│     ├─ 'ai-provider': string       │
│     └─ 'ai-model': string          │
│                                     │
└─────────────────────────────────────┘
```

## API Integration

```
┌─────────────────────────────────────────────────┐
│         Chat Edit Request Flow                  │
│                                                 │
│  Frontend (Browser)                             │
│  ├─ chatEditSpec() prepares payload            │
│  │  ├─ systemPrompt                            │
│  │  ├─ messages[]                              │
│  │  └─ currentSpec                             │
│  │                                             │
│  └─ Sends HTTP request to AI Provider          │
│                                                 │
└────┬────────────────────────────────────────────┘
     │
     ├─ Claude (Anthropic SDK)
     │  └─ client.messages.create()
     │     └─ Returns: message.content.text
     │
     ├─ OpenAI-Compatible APIs
     │  ├─ OpenAI
     │  ├─ OpenRouter
     │  ├─ Cerebras
     │  └─ All use: POST /chat/completions
     │     └─ Returns: data.choices[0].message.content
     │
     └─ Response Processing
        ├─ Extract JSON from ```json...``` block
        ├─ Parse JSON
        ├─ Validate against Zod schema
        └─ Return: { spec, displayText }
```

## Complete Video Update Timeline

```
T=0ms     ┌─────────────────────────────────┐
          │ User types in chat input        │
          │ "Make the title larger"         │
          └────────────┬────────────────────┘
                       │
T=50ms    ┌────────────▼────────────────────┐
          │ handleSend() executes          │
          │ - Validates input               │
          │ - Adds message to chat          │
          │ - Calls chatEditSpec()          │
          └────────────┬────────────────────┘
                       │
T=100ms   ┌────────────▼────────────────────┐
          │ Request sent to AI Provider     │
          │ setIsGenerating(true)           │
          │ Typing indicator appears        │
          └────────────┬────────────────────┘
                       │
T=3000ms  ┌────────────▼────────────────────┐
  (avg)   │ AI processes and responds       │
          │ (depends on provider latency)   │
          └────────────┬────────────────────┘
                       │
T=3050ms  ┌────────────▼────────────────────┐
          │ parseResponse() executes        │
          │ - Extracts JSON                 │
          │ - Parses to object              │
          │ - Validates spec                │
          └────────────┬────────────────────┘
                       │
T=3100ms  ┌────────────▼────────────────────┐
          │ setSpec(newSpec) called         │
          │ Zustand updates state           │
          └────────────┬────────────────────┘
                       │
T=3150ms  ┌────────────▼────────────────────┐
          │ Zustand triggers subscribers    │
          │ - Chat bubbles update           │
          │ - Add "Video updated" badge     │
          │ - Preview component notified    │
          └────────────┬────────────────────┘
                       │
T=3200ms  ┌────────────▼────────────────────┐
          │ Remotion re-renders             │
          │ - Re-compute all frames         │
          │ - Apply new styling             │
          │ - Update player display         │
          └────────────┬────────────────────┘
                       │
T=3500ms  ┌────────────▼────────────────────┐
  (est)   │ Preview shows updated video     │
          │ User sees title is now larger   │
          │ setIsGenerating(false)          │
          │ Chat ready for next edit        │
          └─────────────────────────────────┘

Total: ~3-5 seconds (depends on AI provider)
```

## Skill Rendering Flow

```
┌──────────────────────────────────┐
│  ProjectSpec with Skills         │
│  {                               │
│    composition: {                │
│      tracks: [                   │
│        {                         │
│          clips: [                │
│            {                     │
│              type: "skill",      │
│              skillType: "Lower   │
│              Third",             │
│              skillProps: {       │
│                text: "New Text"  │
│              }                   │
│            }                     │
│          ]                       │
│        }                         │
│      ]                           │
│    }                             │
│  }                               │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  Remotion Player                 │
│  ├─ Reads spec                   │
│  ├─ Renders Root composition     │
│  └─ For each track:              │
│     └─ For each clip:            │
│        ├─ If type === 'skill'    │
│        │  └─ Render skill comp.  │
│        ├─ Else if video/audio    │
│        │  └─ Play media element  │
│        └─ Apply timing & effects │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  Browser Canvas                  │
│  ├─ Draws all tracks             │
│  ├─ Composites with correct      │
│  │  timing and z-order           │
│  └─ Plays in real-time           │
└──────────────────────────────────┘
```

## File Organization

```
src/
├── stores/
│   ├── project-store.ts ────→ spec, assets management
│   ├── chat-store.ts ───────→ messages, AI config
│   └── editor-store.ts ─────→ playback, timeline
│
├── lib/
│   ├── claude/
│   │   ├── chat.ts ─────────→ chatEditSpec() logic
│   │   ├── prompt.ts ───────→ system prompt builder
│   │   └── client.ts ───────→ AI provider integration
│   │
│   ├── spec/
│   │   ├── types.ts ────────→ ProjectSpec, Clip, etc.
│   │   └── validator.ts ────→ Zod schemas
│   │
│   └── storage/
│       ├── db.ts ──────────→ IndexedDB connection
│       ├── projects.ts ────→ Save/load projects
│       ├── assets.ts ──────→ Save/load assets
│       └── api-keys.ts ────→ Save/load API keys
│
├── components/
│   ├── editor/
│   │   ├── preview.tsx ────→ Remotion Player wrapper
│   │   ├── timeline.tsx ───→ Clip visualization
│   │   ├── chat-panel.tsx ─→ Chat interface
│   │   └── toolbar.tsx ────→ Top controls
│   │
│   └── ui/
│       └── *.tsx ──────────→ shadcn/ui components
│
├── skills/
│   ├── registry.ts ────────→ Skill registration
│   ├── remotion/Root.tsx ──→ Main composition
│   └── *.tsx ──────────────→ Individual skills
│
└── app/
    ├── editor/page.tsx ────→ Editor layout
    └── page.tsx ───────────→ Home/generation
```

## Integration Checklist

- [x] Chat store for message history
- [x] Chat panel UI component
- [x] ChatEditSpec function
- [x] Spec validation (Zod)
- [x] Zustand state updates
- [x] Preview re-rendering
- [x] Error handling
- [x] AI provider support
- [x] API key management
- [x] Message history
- [x] "Video updated" badge
- [x] Real-time updates
- [x] Mobile-friendly layout
- [x] Settings panel for AI config

**All components verified and integrated! ✅**

---

**See Also:**
- `CHAT-EDITING-GUIDE.md` - Complete user guide
- `CHAT-PROMPTS.md` - 100+ example prompts
- `CHAT-EDITING-VERIFICATION.md` - Code review & verification
