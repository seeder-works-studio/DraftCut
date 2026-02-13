# DraftCut Promotional Video - Generation Prompt

## Upload These Assets First:
1. `homescreen.png` - DraftCut editor screenshot
2. `cerebralvalley.jpg` - Cerebral Valley logo
3. `claude.png` - Claude AI logo

---

## Video Generation Prompt

Create a 35-second promotional video for DraftCut with the following structure:

**Intro (0-5s) - IntroTitleCard**
- Title: "DraftCut"
- Subtitle: "AI-Powered Video Editor in Your Browser"
- Background: Dark gradient (#1a1a2e)
- Accent color: Purple (#8B5CF6)

**Problem Statement (5-10s) - TextReveal**
- Text: "Video editing shouldn't require complex software"
- Style: fadeIn
- Color: White on dark background

**Solution Demo (10-20s) - ImageSlideshow**
Use the homescreen.png with:
- Ken Burns effect: zoomIn
- Caption: "Just describe your vision, AI does the rest"
- Duration: 10 seconds

**Key Features (20-25s) - KineticTypography**
Lines:
- "✨ Browser-based editing"
- "🤖 AI-powered generation"
- "🎬 Professional results"
Animation: bounce
Timing: word
Stagger: 15 frames

**Recognition Section (25-32s) - TextReveal + BrandLogo**
- TextReveal at 25s: "Built with Claude Opus 4.6"
  - Style: slideUp
  - Duration: 3s

- BrandLogo at 28s: claude.png
  - Animation: pulse
  - Scale: 1.5
  - Duration: 2s

- BrandLogo at 30s: cerebralvalley.jpg
  - Animation: fade
  - Scale: 1.2
  - Duration: 2s

**CTA (32-35s) - OutroCTA**
- Heading: "Start Creating Today"
- CTA Text: "Try DraftCut Free"
- Background: Dark (#1a1a2e)
- Button color: Blue (#3b82f6)

---

## Canvas Settings:
- Aspect Ratio: 16:9 (1920x1080)
- Duration: 35 seconds
- FPS: 30

---

## Brand Kit:
- Primary Color: #8B5CF6 (Purple)
- Secondary Color: #3b82f6 (Blue)
- Background: #1a1a2e (Dark Navy)
- Text: #ffffff (White)

---

## Background Music:
Add upbeat, energetic background music (corporate/tech style) matching 35-second duration.

If you have Beatoven API key configured:
- Genre: Corporate/Tech
- Mood: Energetic, Inspiring
- Tempo: Medium-Fast
- Duration: 35 seconds

---

## Additional Instructions for AI:

1. **Timing is critical** - ensure all skills have proper startTime and duration
2. **Use overlay track** for all skills (TextReveal, KineticTypography, BrandLogo)
3. **Smooth transitions** - use 0.5s crossfades between major sections
4. **Text readability** - ensure all text is large enough and has sufficient contrast
5. **Logo placement** - center all logos, ensure they're visible
6. **Pacing** - don't rush, let each section breathe
7. **Audio levels** - keep background music at 30% volume so it doesn't overpower

---

## Expected Timeline Structure:

```
Track 1 (Base): ImageSlideshow (homescreen.png)
  └─ 10-20s: homescreen.png with zoomIn effect

Track 2 (Overlay): Skills
  ├─ 0-5s: IntroTitleCard
  ├─ 5-10s: TextReveal (problem statement)
  ├─ 20-25s: KineticTypography (features)
  ├─ 25-28s: TextReveal ("Built with Claude Opus 4.6")
  ├─ 28-30s: BrandLogo (claude.png)
  ├─ 30-32s: BrandLogo (cerebralvalley.jpg)
  └─ 32-35s: OutroCTA

Track 3 (Audio): Background music
  └─ 0-35s: Upbeat corporate music
```

---

## Usage Instructions:

### Method 1: Copy-Paste Prompt (Recommended)
1. Open DraftCut at http://localhost:3000
2. Upload the 3 image assets (homescreen.png, cerebralvalley.jpg, claude.png)
3. Copy the "Video Generation Prompt" section above
4. Paste into the prompt input
5. Click "Generate Video"
6. Wait for AI to create the video
7. Review in editor and export

### Method 2: Via Chat Panel (Iterative)
1. Start with basic structure: "Create a 35-second promo video for DraftCut"
2. Add sections one by one via chat:
   - "Add intro title card with 'DraftCut' and subtitle"
   - "Add text reveal at 5s: 'Video editing shouldn't require complex software'"
   - "Add image slideshow with homescreen.png from 10-20s"
   - etc.

---

## Tips for Best Results:

- **Preview before export** - play through the entire video to check timing
- **Check all assets loaded** - ensure logos and images appear correctly
- **Test different music** - try regenerating music if first attempt doesn't fit
- **Adjust text colors** - if text is hard to read, use chat to change colors
- **Fine-tune timing** - use chat to adjust clip durations if pacing feels off

---

## Expected Export Settings:

**For YouTube/Social:**
- Format: WebM (best compatibility)
- Quality: High (10 Mbps)
- Resolution: 1x (1920x1080)

**For Premium Quality:**
- Format: MP4 (Diffusion Studios)
- Quality: Ultra (25 Mbps)
- Resolution: 1x or 1.5x

---

## Troubleshooting:

**If TextReveal shows blank screen:**
- Ensure Root.tsx has all skills registered (fixed in latest commit)
- Refresh the page
- Check browser console for errors

**If logos don't appear:**
- Verify asset IDs match uploaded files
- Check if assetBlobUrls are loaded
- Try re-uploading the logo files

**If music doesn't generate:**
- Verify Beatoven or Replicate API key is configured
- Check API key has sufficient credits
- Try regenerating via chat: "Add background music"

---

**Generated with Claude Opus 4.6 for the Cerebral Valley + Claude.ai Hackathon** 🎬
