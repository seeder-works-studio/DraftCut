# Claude Hackathon Showcase Demo - DraftCut

**Goal:** Create a stunning 60-90 second showcase video demonstrating DraftCut's AI-powered video editing capabilities.

---

## 📁 Assets to Upload:

1. **Videos** (will be auto-analyzed):
   - `[hackathon_kickoff]_built_with_opus_4.6__a_claude_code_hackathon (720p).mp4`
   - `[live_session]_ama_with_cat_wu (720p).mp4`

2. **Images**:
   - `homescreen.png` - DraftCut interface screenshot
   - `cerebralvalley.jpg` - Cerebral Valley logo
   - `claude.png` - Claude AI logo

---

## 🎬 Video Generation Prompt (Copy This):

```
Create a 90-second hackathon showcase video for DraftCut using the uploaded videos and images.

CRITICAL REQUIREMENTS:
1. Video Analysis: Use AI-analyzed highlights from BOTH videos - extract ONLY the best talking head moments with highest interest scores
2. Motion Graphics: Layer bold, centered text overlays over talking head segments
3. Logo Visibility: Check logo colors in assets - use HIGH CONTRAST backgrounds (if logo is dark, use white/light background; if logo is light, use dark background)
4. Typography: ALL text must be LARGE (96-120px), BOLD, and CENTERED
5. Pacing: Fast cuts, no dead space, energetic flow

STRUCTURE (90 seconds total):

[0-5s] COLD OPEN - Talking Head + Lower Third
- Use BEST talking head clip from either video (highest interest score)
- LowerThird with speaker name (if identifiable)
- Keep audio, let them speak

[5-10s] TITLE CARD - IntroTitleCard
- Title: "DraftCut"
- Subtitle: "AI-Powered Video Editing"
- Background: #1a1a2e (dark)
- Title color: #ffffff (white)
- Accent: #8B5CF6 (purple)
- Font size: 120px title, 64px subtitle

[10-20s] PROBLEM + SOLUTION - Talking Head + TextReveal
- Continue talking head OR new clip
- Overlay TextReveal (transparent background):
  - Text: "Create videos with just a prompt"
  - Style: slideUp
  - Font size: 108px
  - Bold, centered
  - Color: #ffffff with dark text shadow for readability

[20-35s] DEMO SHOWCASE - ImageSlideshow + KineticTypography
- ImageSlideshow with homescreen.png
  - Ken Burns: zoomIn (slow, 15 seconds)
  - No caption
- Overlay KineticTypography (transparent):
  - Lines:
    * "🎬 AI Video Generation"
    * "✂️ Smart Clip Selection"
    * "🎨 Motion Graphics"
  - Animation: bounce
  - Timing: word
  - Font size: 96px
  - Bold, centered, white text

[35-50s] HACKATHON RECOGNITION - Talking Head + TextReveal + BrandLogo
- Use another high-energy talking head clip
- 35-42s: TextReveal overlay
  - Text: "Built with Claude Opus 4.6"
  - Style: wordPop
  - Font size: 96px
  - Bold, centered
  - Color: #8B5CF6 (purple)
- 42-46s: BrandLogo (claude.png)
  - Check logo colors first!
  - If logo is dark: backgroundColor: "#ffffff"
  - If logo is light: backgroundColor: "#1a1a2e"
  - Animation: pulse
  - Scale: 2.0 (large and prominent)
  - Position: center
- 46-50s: BrandLogo (cerebralvalley.jpg)
  - Check logo colors!
  - Use contrasting background
  - Animation: fadeIn
  - Scale: 1.8
  - Position: center

[50-70s] KEY FEATURES - Split Talking Head + Feature Callouts
- Use 2-3 rapid talking head clips (3-5s each)
- Between clips, insert TextReveal (1-2s each):
  - "Browser-Based" (bold, 108px)
  - "No Installation" (bold, 108px)
  - "AI-Powered" (bold, 108px)
- All text: transparent background, white with shadow, centered

[70-85s] SOCIAL PROOF - Talking Head + Stats
- Use enthusiastic talking head moment
- Overlay CountUpNumber:
  - from: 0, to: 100
  - suffix: "%"
  - prefix: "AI Accuracy: "
  - Font size: 120px
  - Bold, centered
  - Color: #00d9ff (cyan)
  - Duration: 2 seconds

[85-90s] CALL TO ACTION - OutroCTA
- Heading: "Start Creating Today"
- CTA text: "Try DraftCut Free"
- Background: #1a1a2e
- Button color: #8B5CF6
- Button text: #ffffff
- Logo: homescreen.png thumbnail (small, corner)

AUDIO:
- Keep original audio from talking head segments
- Lower volume during text overlays (if talking continues)
- NO background music (let speakers shine)

TRANSITIONS:
- 0.3s crossfades between major sections
- Jump cuts between talking head clips (no fade)
- Smooth skill transitions

MOTION GRAPHICS RULES:
✅ ALL TEXT: Bold, centered, large (96-120px)
✅ Text over video: Transparent background + text shadow for readability
✅ Logos: CHECK COLORS, use contrasting backgrounds, large scale (1.8-2.0x)
✅ Lower thirds: Keep visible but not distracting
✅ No static moments: constant motion, quick cuts
✅ Talking heads: Use highest interest score clips only

BRAND COLORS:
- Primary: #8B5CF6 (purple)
- Secondary: #00d9ff (cyan)
- Dark: #1a1a2e
- Light: #ffffff
```

---

## 🎯 Key Features to Highlight:

1. **AI Video Analysis** - Show it automatically finds best moments
2. **Smart Clip Selection** - Extracts highlights from long videos
3. **Motion Graphics** - Professional overlays and animations
4. **Browser-Based** - No installation required
5. **Claude Opus 4.6** - Built with cutting-edge AI
6. **Hackathon Winner** - Cerebral Valley recognition

---

## 💡 Visual Style Guide:

### Typography:
- **All text overlays**: 96-120px, bold, centered
- **Use text shadows** for readability over video: `2px 2px 8px rgba(0,0,0,0.8)`
- **Font**: Inter (bold weight)

### Colors:
- **Dark backgrounds**: #1a1a2e, #000000
- **Light backgrounds**: #ffffff, #f5f5f5
- **Accent purple**: #8B5CF6
- **Accent cyan**: #00d9ff
- **Text**: Always high contrast (white on dark, dark on light)

### Logo Display:
**CRITICAL - Check Before Using:**

1. **Claude logo (claude.png)**:
   - If dark logo → Use `backgroundColor: "#ffffff"` or `"#f5f5f5"`
   - If light logo → Use `backgroundColor: "#1a1a2e"` or `"#000000"`
   - Scale: 2.0 (very prominent)
   - Center positioning

2. **Cerebral Valley logo**:
   - Same contrast rules
   - Scale: 1.8
   - Center positioning

3. **DraftCut screenshot** (homescreen.png):
   - Dark interface → Can use on any background
   - Use Ken Burns zoom for interest

### Motion:
- **Talking heads**: Quick cuts, keep energy high
- **Text reveals**: Fast animations (wordPop, slideUp)
- **Logos**: Smooth entrances (pulse, fadeIn)
- **Transitions**: 0.3s crossfades max

---

## 🚀 Usage Instructions:

### Step 1: Upload Assets
- Upload both MP4 videos first
- Wait for "Video analyzed!" toasts (~60 seconds)
- Then upload 3 images (homescreen, cerebralvalley, claude)

### Step 2: Generate
- Copy the full prompt from above
- Paste into DraftCut
- Click "Generate Video"
- Wait ~30 seconds for AI generation

### Step 3: Review
- Check talking head moments are good clips
- Verify logo backgrounds have proper contrast
- Ensure text is large, bold, and centered
- Test pacing (should feel energetic, not slow)

### Step 4: Refine (if needed)
Via chat panel:
```
"Make all text larger and bolder"
"Change claude logo background to white for better contrast"
"Speed up transitions - use 0.2s crossfades"
"Replace clip at 10s with a more energetic moment"
```

### Step 5: Export
- Format: WebM (YouTube-compatible) or MP4 (Diffusion Studios)
- Quality: High (10 Mbps) or Ultra (25 Mbps)
- Resolution: 1x (1920x1080)

---

## 📊 Expected Results:

**Timeline Breakdown:**
- **Talking head clips**: 40-50 seconds (using AI-selected highlights)
- **Motion graphics**: 30-40 seconds (overlays and standalone)
- **Logos**: 8 seconds total (prominent display)
- **CTA**: 5 seconds (strong ending)

**Visual Style:**
- Bold, centered typography throughout
- High contrast (no hard-to-read text)
- Prominent logo display with correct backgrounds
- Fast-paced, energetic editing
- Professional motion graphics

**Showcase Features:**
- AI video analysis (automatically finds best moments)
- Smart clip selection (no manual scrubbing)
- Professional motion graphics
- Browser-based editing
- Claude Opus 4.6 integration

---

## 🎬 Alternative Shorter Version (60s):

If you want a faster-paced 60-second version:

```
[0-5s] Cold open + Lower Third
[5-10s] Title Card
[10-25s] Demo showcase (homescreen)
[25-35s] Recognition (Claude + Cerebral Valley logos)
[35-50s] Features (3 talking head clips + text overlays)
[50-55s] Stats
[55-60s] CTA
```

---

## 🐛 Troubleshooting:

**"Logo is hard to see"**
→ Check asset colors, use opposite background (dark logo = light background)

**"Text is too small"**
→ Via chat: "Make all text 120px and bold"

**"Talking head clips are boring"**
→ Video analysis picks best moments automatically. If still boring, use chat: "Replace with more energetic clip"

**"Too many gaps"**
→ Via chat: "Remove all gaps, make seamless transitions"

**"Pacing too slow"**
→ Via chat: "Speed up - use 0.2s transitions, cut dead space"

---

**This prompt showcases DraftCut's most impressive features while creating a professional, energetic hackathon demo!** 🎬✨
