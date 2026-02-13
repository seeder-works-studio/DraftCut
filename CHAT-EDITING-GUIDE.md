# Chat-Based Iterative Video Editing

## Overview

After your video is generated, DraftCut's chat interface on the left side of the editor allows you to **iteratively refine and edit your video in real-time** using natural language. This includes editing motion graphics properties, timing, text content, and more.

## ✅ How It Works

### Architecture

```
Editor Page (right side)
├── Preview (top) → Shows updated video in real-time
├── Timeline (bottom) → Visual representation of clips
└── Chat Panel (left side, 400px)
    ├── Messages display
    ├── AI config settings
    └── Input field

Flow:
User types → Chat sends request → AI reads current spec → AI modifies spec →
Spec validated → Applied to project → Preview updates → "Video updated" badge shows
```

### Complete Workflow

1. **Generate Video**
   - You provide a prompt and upload assets
   - AI generates initial ProjectSpec
   - Editor opens with video preview and chat panel

2. **Chat Opens with Welcome Message**
   ```
   "I generated your video. Ask me to make changes — try "Make the intro longer"
   or "Change the CTA text"."
   ```

3. **Enter Your Edit Request**
   - Click in the chat input at the bottom
   - Type natural language request
   - Press Enter to send
   - Type examples:
     - "Make the intro 2 seconds longer"
     - "Change the title to 'My New Video'"
     - "Add a lower third with 'John Doe - CEO'"
     - "Make the background color blue"
     - "Remove the outro"
     - "Change the CTA button text to 'Subscribe'"

4. **AI Processes Your Request**
   - Chat shows typing indicator (animated dots)
   - AI receives:
     - Your current request message
     - Full conversation history
     - Complete current ProjectSpec JSON
     - Available assets
   - AI generates updated spec with your changes

5. **Video Updates Automatically**
   - Spec is validated for correctness
   - If valid: "Video updated" badge appears on assistant's message
   - Preview automatically re-renders
   - You see changes immediately
   - If invalid: Shows error message with explanation

6. **Continue Iterating**
   - Make another request for more changes
   - Changes stack on top of previous ones
   - Each message in history preserved
   - Full editing session captured

## 🎯 What You Can Edit

### Motion Graphics (Skills)

Edit properties of any skill overlay:

```
"Add a lower third at 5 seconds with 'Jane Smith - CEO' in blue"
→ Creates LowerThird skill clip

"Change the intro title to 'Welcome to DraftCut'"
→ Modifies IntroTitleCard text

"Make the CTA button say 'Download Now' and link to example.com"
→ Updates OutroCTA props

"Add a text reveal overlay at 15 seconds saying 'Key Point!'"
→ Creates TextReveal skill

"Add a callout box at 20 seconds saying 'Important!' in the top-right"
→ Creates CalloutBoxArrow skill
```

### Timing & Duration

```
"Make the intro 3 seconds instead of 2"
"Extend the video from 30 seconds to 60 seconds"
"Remove the 15-second silence in the middle"
"Start the lower third at 5 seconds instead of 3"
```

### Text Content

```
"Change all text to uppercase"
"Replace 'Subscribe' with 'Follow'"
"Update the brand name from 'Acme' to 'TechCorp'"
```

### Styling

```
"Make the background darker"
"Change the accent color to purple"
"Use a larger font for the title"
"Make the text white instead of black"
```

### Composition

```
"Add an intro card"
"Remove the outro"
"Reorder the clips: video 2, then video 1, then video 3"
"Add transitions between all clips"
```

### Media

```
"Use the second image instead of the first"
"Add background music"
"Remove the audio track"
```

## 💡 Examples

### Example 1: Talking Head Interview

**Initial generation:**
- 2-minute video with lower third showing "Dr. Sarah Chen - AI Expert"
- No motion graphics

**Chat edits:**

| User Request | Result |
|---|---|
| "Add a caption at the 30-second mark that says 'AI will transform work'" | CaptionsPop skill added at 30s |
| "Make the lower third stay on screen for the whole video" | Duration extended from 5s to 120s |
| "Add an outro card at the end with 'Learn More at example.com'" | OutroCTA skill added at 120s |
| "Change the title text to 'Dr. Sarah Chen - Chief AI Officer'" | LowerThird text updated |
| "Make the background darker and add blue accents" | Canvas background and colors updated |

### Example 2: Product Demo

**Initial generation:**
- 60-second video showing product features
- Text overlays at key moments

**Chat edits:**

| User Request | Result |
|---|---|
| "Make it 90 seconds total" | Canvas duration extended |
| "Add a title card that says 'Product Demo'" | IntroTitleCard added |
| "Emphasize the main feature with a callout box" | CalloutBoxArrow added at highlight |
| "Change all text colors to match our brand (purple and gold)" | Colors updated throughout |
| "Add fade transitions between sections" | Transitions added to clips |

### Example 3: Social Media Clip

**Initial generation:**
- 15-second video with captions

**Chat edits:**

| User Request | Result |
|---|---|
| "Make it 30 seconds by repeating the best part" | Clips duplicated, duration extended |
| "Make the text bigger and bolder" | Text styling updated |
| "Add emoji reactions to the key moments" | Converted to TextReveal with emojis |
| "Add a CTA to follow on Instagram: @ourcompany" | OutroCTA updated with Instagram link |

## 🔧 Technical Details

### Chat Message Structure

**User Message:**
```typescript
{
  id: "msg-1707123456",
  role: "user",
  content: "Make the intro 3 seconds longer",
  timestamp: 1707123456
}
```

**Assistant Message (with update):**
```typescript
{
  id: "msg-1707123457-resp",
  role: "assistant",
  content: "Updated the intro duration from 2 seconds to 5 seconds.",
  specJson: true,  // Flag indicating spec was updated
  timestamp: 1707123457
}
```

### System Prompt

The chat system prompt includes:

```
1. Base generation prompt (skills, formats, best practices)
2. Current ProjectSpec as JSON
3. Instructions to return COMPLETE updated spec
4. Requirement to preserve unmodified clips
5. Instruction to update metadata.modified timestamp
```

### Response Parsing

AI responses are parsed for ```json code block:

- **If JSON found**: Validated and applied
- **If invalid JSON**: Error shown, spec unchanged
- **If no JSON**: Treated as info response, no spec change

### Spec Validation

Updated specs validated using Zod schema that checks:

```
✓ canvas (dimensions, fps, duration)
✓ composition (tracks, clips, timing)
✓ assets (all referenced assets exist)
✓ skills (valid skill types with required props)
✓ timing (no negative start times, no clips beyond duration)
```

## 🎯 AI Configuration

The chat panel includes built-in AI provider switching:

**Default Providers:**
- Claude Opus 4.6 (best for complex edits)
- Claude Sonnet 4.5 (fast, good quality)
- Claude Haiku 4.5 (fastest, lightweight edits)
- OpenAI GPT-4o (alternative provider)
- OpenRouter (access to multiple models)
- Cerebras (ultra-fast)

**Settings Panel:**

```
Settings (gear icon in chat panel header)
├── Provider selector
├── API Key input
└── Model selector
```

Changes saved to IndexedDB and persist across sessions.

## ⚙️ How Spec Updates Flow Through System

```
Chat Input
    ↓
chatEditSpec() [src/lib/claude/chat.ts]
    ↓
AI Provider (Claude/OpenAI/etc)
    ↓
parseResponse() - extract JSON
    ↓
validateProjectSpec() - Zod validation
    ↓
setSpec() - Zustand project store
    ↓
useProjectStore hook detects change
    ↓
Preview component re-renders
    ↓
All tracks, clips, skills updated
    ↓
Remotion composition updates
    ↓
User sees new video in real-time
```

## 🚀 Advanced Editing Patterns

### Batch Edits

Make multiple changes in one request:

```
"Make the intro card say 'Welcome to DraftCut' in purple,
extend it to 5 seconds, and add a fade transition.
Then add a CTA at the end saying 'Get Started'."
```

### Conditional Edits

Ask for conditional logic:

```
"If the video is longer than 60 seconds, remove all clips
shorter than 3 seconds"
```

### Style Consistency

Update branding across video:

```
"Update all text colors to white, backgrounds to dark blue,
and accents to neon green. Apply to all skills."
```

### Timing Adjustments

Request rhythm changes:

```
"Make the pacing faster - reduce all clip durations by 30%
except the intro and outro"
```

## ⚡ Performance

- **Response Time**: 3-10 seconds depending on provider
- **Spec Size**: Full ProjectSpec sent/received each request
- **Validation**: <100ms for most specs
- **Preview Update**: <500ms re-render
- **Total Latency**: Usually 4-12 seconds per edit

## 🛠️ Troubleshooting

### Chat Says "Video updated" but Preview Unchanged

1. Check console for errors
2. Try refreshing the preview
3. Verify the spec change was applied
4. Check that modified clip duration < canvas duration

### "Error: Invalid spec JSON"

1. Chat tried to update but JSON was malformed
2. AI's response didn't include valid JSON
3. Solution: Rephrase request or try simpler edit

### No API Key Configured

1. Yellow warning appears in chat
2. Click "Open settings" button
3. Enter your API key
4. Save (automatically persisted)

### Model Not Working

1. Verify API key is valid
2. Check API provider has credits
3. Try a different model
4. Check provider docs for rate limits

## 📝 Best Practices

1. **Be Specific**
   - ✅ "Change the lower third text to 'John Doe - CEO'"
   - ❌ "Make it say John Doe"

2. **Reference by Type**
   - ✅ "Update the intro card text"
   - ❌ "Change the first thing"

3. **Include Timing When Relevant**
   - ✅ "Add a caption at 20 seconds"
   - ❌ "Add a caption"

4. **Test Incrementally**
   - Make small changes first
   - Verify in preview
   - Build up complex edits

5. **Preserve Intent**
   - Each edit should enhance the video
   - Don't request contradictory changes
   - Consider overall composition

## 🎬 Complete Example: Conference Talk

**Initial Prompt:**
```
Create a 3-minute conference talk intro with:
- Speaker name overlay
- Key topic highlights
- Professional blue and white theme
```

**Generated:**
- IntroTitleCard "Conference 2025"
- LowerThird "Dr. Jane Smith - Keynote Speaker" at 5 seconds
- CaptionsPop "3 Key Insights" at 30 seconds
- TextReveal for each insight at 35s, 40s, 45s
- OutroCTA "Visit conference.com" at 175 seconds

**Chat Edits:**

1. User: "Make the intro title bigger and more prominent"
   → Assistant updates IntroTitleCard fontSize and styling

2. User: "Change the speaker name to include her credentials: Dr. Jane Smith, PhD"
   → Assistant updates LowerThird text

3. User: "The insights are good but change the second one to 'Real-world Applications'"
   → Assistant updates second TextReveal content

4. User: "Make the overall style more energetic - brighter colors and faster transitions"
   → Assistant updates canvas colors and clip transition durations

5. User: "Add a closing message at 3 minutes: 'Thank you!'"
   → Assistant adds TextReveal at 180 second mark

6. User: "Perfect! That's exactly what I wanted"
   → Video is ready to export

## 🔮 Future Enhancements

### Planned

- **Undo/Redo**: Step back through edit history
- **Batch Analysis**: "What can I improve?" - AI suggests edits
- **Asset Swapping**: "Replace image 1 with a better photo"
- **Layout Presets**: "Use the 'Interview' layout template"
- **Multi-language**: "Generate Spanish version with subtitles"

### Potential

- **Voice Instructions**: "Make the video 10 seconds shorter"
- **Gesture Control**: Draw on timeline to indicate changes
- **Smart Suggestions**: "Based on your edits, try..."
- **Collaboration**: Share editing session with team
- **Version History**: Rollback to previous versions

## 📚 Related Documentation

- [AGENTIC-VIDEO-SYSTEM.md](./AGENTIC-VIDEO-SYSTEM.md) - AI refinement system for generating videos
- [TALKING-HEAD-EXAMPLE.md](./TALKING-HEAD-EXAMPLE.md) - Complete example with motion graphics
- [VIDEO-CONTENT-ANALYSIS.md](./VIDEO-CONTENT-ANALYSIS.md) - AI-powered video analysis with Gemini
- [CLAUDE.md](./CLAUDE.md) - Project architecture and technical details

---

**Bottom Line:** The chat interface is fully functional for iterative editing. You can edit motion graphics, timing, text, styling, and composition—all in natural language with real-time preview updates! 🚀
