# Chat Panel Guide: Iterative Video Editing

The chat panel in the editor lets you **refine and improve your video using natural language**. Think of it as a conversation with an AI video editor.

## What You Can Do

### 1. **Make Quick Edits**

Ask for specific changes and the AI will update your video:

```
"Make the intro 5 seconds long"
"Change the background color to blue"
"Add a text overlay saying 'New Product Launch'"
"Move the CTA to 15 seconds"
"Make the text bigger"
"Change the button text to 'Shop Now'"
```

### 2. **Improve Pacing & Timing**

```
"Make the video faster-paced"
"Add a 2-second pause between sections"
"Make the slideshow transitions smoother"
"Extend the outro to 7 seconds"
```

### 3. **Add or Remove Elements**

```
"Add captions at the bottom"
"Remove the logo from the intro"
"Add a lower third showing 'CEO, Jane Smith'"
"Add bullet points showing our key features"
```

### 4. **Change Text Content**

```
"Change the headline to 'Revolutionary AI Video Editor'"
"Update the CTA text to 'Get Started Free'"
"Make the tagline say 'Videos in Seconds'"
```

### 5. **Adjust Visual Style**

```
"Use our brand colors: green #4A7C59 and gold #F4C542"
"Make all text white"
"Change the intro background to dark blue"
"Use a fade-in animation instead of slide-up"
```

### 6. **Restructure the Video**

```
"Swap the order of slides 2 and 3"
"Add an intro before the slideshow"
"Move the benefits section to the beginning"
"Add a call-to-action at the end"
```

### 7. **Ask Questions**

```
"What skills are being used?"
"How long is the video?"
"What are the current brand colors?"
"Show me all the text in the video"
```

## How It Works

1. **Type your request** in the chat input
2. **AI analyzes** the current video spec
3. **Makes changes** and returns updated spec
4. **Preview updates automatically** - you see changes in real-time
5. **Continue refining** - keep chatting to make more changes

## Example Conversation

```
You: "Make the intro 3 seconds"
AI: "Updated intro duration to 3 seconds. ✅ Video updated"
[Preview updates]

You: "Add text saying 'Welcome to DraftCut' in the middle"
AI: "Added TextReveal skill with 'Welcome to DraftCut' at 8s for 4s. ✅ Video updated"
[Preview updates]

You: "Make that text gold color"
AI: "Changed text color to #F4C542 (gold). ✅ Video updated"
[Preview updates]
```

## Advanced: Agentic Mode 🤖

**Agentic mode** is an autonomous AI agent that iteratively improves your video automatically.

### How to Enable:
1. Go to Settings (home page) > Agentic Mode
2. Enable "Autonomous Refinement"
3. Set target quality score (default: 85/100)
4. Set max iterations (default: 5)

### What It Does:
- **Analyzes** video quality automatically
- **Identifies issues**: static images, poor pacing, missing animations
- **Fixes problems**: converts static images to Ken Burns slideshows, adds motion
- **Iterates** until quality score reaches target
- **Uses tools** to understand and improve content

### Agentic Mode Capabilities:

1. **Automatic Quality Analysis**
   - Checks for static images (converts to animated slideshows)
   - Validates timing (no overlaps, gaps, or errors)
   - Ensures professional structure (intro → content → outro)
   - Scores video 0-100

2. **Video Content Understanding** (requires Gemini API)
   - Analyzes actual video files using AI vision
   - Identifies scenes, highlights, and key moments
   - Suggests optimal trim points
   - Recommends video ordering

3. **Intelligent Improvements**
   - Adds Ken Burns effects to all images
   - Varies pacing (mixes 3-5s and 6-10s clips)
   - Adds professional motion graphics
   - Fixes composition issues

### Example Agentic Workflow:

```
Initial video score: 65/100

🤖 Iteration 1: Converting static images to ImageSlideshow with Ken Burns...
   Score: 72/100

🤖 Iteration 2: Adding intro and outro, improving pacing...
   Score: 78/100

🤖 Iteration 3: Adding text overlays and motion graphics...
   Score: 84/100

🤖 Iteration 4: Final polish - optimizing transitions...
   Score: 87/100

✅ Target reached! Video quality: 87/100
```

## Tips for Best Results

### Be Specific
❌ "Make it better"
✅ "Make the text bigger and change it to gold color"

### One Change at a Time
❌ "Make intro 5s, change colors, add text, and swap slides"
✅ "Make the intro 5 seconds"
→ "Now change the background to blue"
→ "Add text saying 'Welcome'"

### Reference Timing
✅ "Add a text overlay at 10 seconds"
✅ "Make the slideshow start at 3s and end at 15s"

### Use Skill Names (if you know them)
✅ "Add a LowerThird showing 'CEO, Jane Smith'"
✅ "Use TextReveal with wordPop style for the headline"

### Ask for Explanations
✅ "What's currently in the video?"
✅ "Why is the video 20 seconds long?"
✅ "What animations are being used?"

## Keyboard Shortcuts

- **Enter** - Send message
- **Shift + Enter** - New line

## Settings

Click the **gear icon** in the chat panel to configure:
- **AI Provider**: Claude, OpenAI, OpenRouter, Cerebras
- **API Key**: Your API key for the selected provider
- **Model**: Specific model to use (e.g., Claude Sonnet 4.5)

## What the Chat CAN'T Do

- ❌ Upload new assets (do this on home page)
- ❌ Export videos (use Export button in toolbar)
- ❌ Change project-level settings like resolution
- ❌ Access external websites or files

## Common Use Cases

### Quick Fix
```
"The CTA button text should say 'Buy Now' not 'Learn More'"
```

### Visual Polish
```
"Make all the text animations use the 'wordPop' style"
"Add a subtle glow effect to the buttons"
```

### Timing Adjustment
```
"The slides are moving too fast, make each one 6 seconds"
```

### Content Changes
```
"Change the bullet points to:
- Free shipping
- 30-day returns
- Lifetime warranty"
```

### Brand Alignment
```
"Use our brand colors everywhere: primary #1E3A8A, secondary #F59E0B"
```

## Understanding AI Responses

✅ **"Video updated"** - Changes applied successfully

⚠️ **"Note: I tried to update but..."** - JSON was invalid, try rephrasing

ℹ️ **Text only (no update)** - Answered a question without changing the spec

## Best Practices

1. **Start simple** - Get familiar with basic edits first
2. **Preview after each change** - Watch how the video evolves
3. **Use agentic mode for polish** - Let AI optimize automatically
4. **Save often** - Changes auto-save to IndexedDB
5. **Experiment freely** - Can't break anything, just regenerate if needed

## Advanced: Working with Video Content

If you have actual video files (not just images), the chat can help:

```
"Analyze the video content and suggest the best 30 seconds"
"Order these videos to tell a story"
"Find the most exciting moments in the footage"
"Trim the boring parts from the beginning"
```

This requires:
- Gemini API key (for video analysis)
- Enabling "Gemini Video Analysis" in Settings > Media Services

---

**The chat panel is your AI video editing assistant - use it to iterate, refine, and perfect your videos through natural conversation!** 🎬
