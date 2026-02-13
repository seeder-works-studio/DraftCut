# Adding Motion Graphics to Talking Head Videos

## 🎯 Complete Example: Interview/Presentation

### Scenario
You have a 2-minute interview video and want to add:
- Name/title graphics (lower third)
- Captions for key quotes
- Text reveals for main points
- Intro and outro cards

---

## 📝 DraftCut Prompt

```
Create a professional 2-minute interview video with motion graphics overlays.

VIDEO STRUCTURE:

1. INTRO (0-3s):
   - IntroTitleCard with animated entrance
   - Title: "Expert Interview"
   - Subtitle: "Insights on AI Development"
   - Use animated accent bars
   - Background: #0a0a0a, Primary: #3b82f6, Accent: #8b5cf6

2. MAIN VIDEO (3-117s):
   - Video clip: interview.mp4
   - Play from 0s to 114s (full video)
   - Position on main video track

3. LOWER THIRD - Name Introduction (5-10s):
   - LowerThird overlay at 5 seconds
   - Text: "Dr. Sarah Chen"
   - Subtext: "AI Research Lead, Tech Corp"
   - Duration: 5 seconds
   - Accent color: #3b82f6 (blue)
   - Animate in from left

4. KEY QUOTE #1 (20-25s):
   - CaptionsPop overlay at 20 seconds
   - Text: "AI will transform how we work"
   - Style: bold, large text
   - Position: center-top
   - Duration: 5 seconds

5. KEY INSIGHT (35-42s):
   - TextReveal overlay at 35 seconds
   - Text: "3 Key Principles:"
   - Style: slideUp animation
   - Duration: 7 seconds
   - Below this, add three more TextReveal overlays:
     - At 42s: "1. Data Quality" (3s)
     - At 45s: "2. Human Oversight" (3s)
     - At 48s: "3. Ethical AI" (3s)

6. CALLOUT MOMENT (60-65s):
   - CalloutBoxArrow overlay at 60 seconds
   - Text: "Critical Point!"
   - Position: top-right
   - Arrow pointing down-left
   - Duration: 5 seconds

7. FINAL QUOTE (95-102s):
   - CaptionsPop overlay at 95 seconds
   - Text: "The future is collaborative AI"
   - Style: bold, emphasized
   - Duration: 7 seconds

8. OUTRO (117-120s):
   - OutroCTA with pulsing button
   - Heading: "Want to Learn More?"
   - CTA Text: "Visit Our Website"
   - CTA URL: "techcorp.com/ai"
   - Include animated glow effects

STYLING:
- Video track: Main video plays throughout
- Overlay track: All motion graphics on separate track
- Background: Dark professional (#0a0a0a)
- Primary: Tech blue (#3b82f6)
- Accent: Purple (#8b5cf6)
- Text: White (#ffffff)
- Font: Clean, modern sans-serif

TIMING:
- Keep overlays short (3-7 seconds)
- Don't overlap text elements
- Sync with natural speech pauses
- Fade in/out smoothly

Remember: Video clip plays on main track, all skills overlay on top!
```

---

## 🎨 Visual Timeline

```
Timeline (2 minutes):

Track 1 (Video):     [========== interview.mp4 ==========]
                     3s                                117s

Track 2 (Overlays):
  [Intro]___[LowerThird]___[Caption]___[Text Reveal]___[Callout]___[Caption]___[Outro]
  0-3s      5-10s          20-25s      35-48s          60-65s       95-102s    117-120s
```

---

## ⚡ Quick Test Prompt (30 seconds)

For a quick test with a short video:

```
Add motion graphics to this 30-second talking head video:

1. VIDEO (0-30s): Play the uploaded video clip
2. LOWER THIRD (2-7s): Show "John Doe - Software Engineer" with blue accent
3. TEXT OVERLAY (15-20s): Add caption "This changed everything" in bold
4. CALLOUT (22-27s): Add callout box "Key Insight!" top-right corner

Style: Dark theme, blue/purple accents, modern and professional.
```

---

## 💡 Common Patterns

### Pattern 1: Interview with Multiple Guests
```
Video: Interview footage (main track)
Overlays:
- 5s: Guest 1 lower third "Jane Smith - CEO"
- 30s: Guest 2 lower third "Bob Jones - CTO"
- 60s: Guest 1 again (if they speak more)
- Key quotes as CaptionsPop throughout
```

### Pattern 2: Tutorial/Presentation
```
Video: Presenter speaking (main track)
Overlays:
- Section titles as TextReveal at each topic change
- Key points as CaptionsPop when mentioned
- Callout boxes to highlight important moments
- Lower third with presenter name at start
```

### Pattern 3: Podcast/Interview Clips
```
Video: Podcast video (main track)
Overlays:
- Intro card with topic/episode
- Lower thirds for each speaker
- Quote highlights when they say something quotable
- Outro with CTA (Subscribe, Follow, etc.)
```

---

## 🛠️ Technical Details

### How It Works

**In DraftCut:**
1. Video clip on Track 1 (main video)
2. Skill clips on Track 2 (overlays)
3. Skills layer ON TOP of video
4. Remotion Player renders both together

**Timeline Structure:**
```json
{
  "composition": {
    "tracks": [
      {
        "id": "track-1",
        "type": "video",
        "clips": [
          {
            "type": "video",
            "assetId": "interview-video",
            "startTime": 0,
            "duration": 120
          }
        ]
      },
      {
        "id": "track-2",
        "type": "video",  // Overlay track
        "clips": [
          {
            "type": "skill",
            "skillType": "LowerThird",
            "startTime": 5,
            "duration": 5
          },
          {
            "type": "skill",
            "skillType": "CaptionsPop",
            "startTime": 20,
            "duration": 5
          }
        ]
      }
    ]
  }
}
```

---

## 🎯 Available Motion Graphics Skills

### 1. **LowerThird** - Name/Title Graphics
- **Use**: Speaker identification, location tags
- **Props**: text, subtext, accentColor
- **Best For**: Interviews, presentations, testimonials
- **Duration**: 3-7 seconds

### 2. **CaptionsPop** - Animated Captions
- **Use**: Highlight key quotes, emphasis
- **Props**: text, style (bold/normal), position
- **Best For**: Social media clips, key moments
- **Duration**: 3-5 seconds

### 3. **TextReveal** - Animated Text
- **Use**: Section titles, lists, key points
- **Props**: text, style (typewriter/fadeIn/slideUp/wordPop/glitch)
- **Best For**: Educational content, structured presentations
- **Duration**: 2-4 seconds per item

### 4. **CalloutBoxArrow** - Attention Grabbers
- **Use**: Point out important things, create urgency
- **Props**: text, position, arrow direction
- **Best For**: Highlighting moments, creating tension
- **Duration**: 2-5 seconds

### 5. **IntroTitleCard** - Video Intro
- **Use**: Professional opening
- **Props**: title, subtitle, logo, accentColor
- **Best For**: All video types
- **Duration**: 3-5 seconds

### 6. **OutroCTA** - Video Ending
- **Use**: Call-to-action, next steps
- **Props**: heading, message, buttonText, buttonUrl
- **Best For**: Marketing videos, tutorials
- **Duration**: 5-8 seconds

---

## ⚠️ Current Limitations

### Preview vs Export

**✅ WORKS IN PREVIEW (Editor):**
- All skills render beautifully with Remotion Player
- See animations in real-time
- Adjust timing and properties

**⚠️ EXPORT STATUS:**
- ImageSlideshow: ✅ Fully exports with Ken Burns
- Other skills: ⚠️ Render as placeholder text
  - LowerThird → "[LowerThird skill]" text
  - CaptionsPop → "[CaptionsPop skill]" text
  - etc.

### Why?

Export currently uses canvas rendering with frame-by-frame drawing. Only ImageSlideshow has custom canvas rendering implemented. Other skills need:

1. Pre-render Remotion skill to video
2. Composite skill video onto main video
3. Maintain timing and sync

**Timeline:** 8-12 hours of development to implement full skill export.

---

## 🔮 Workaround (Until Full Export Ready)

### Option 1: Use Remotion Player Export
If you have Remotion installed:
```bash
npx remotion render src/skills/remotion/Root.tsx output.mp4
```

### Option 2: Screen Record Preview
1. Play video in DraftCut editor
2. Use screen recording (QuickTime, OBS)
3. Record the preview window
4. Quick and works immediately!

### Option 3: Wait for Full Skill Export
Coming soon! When implemented, all skills will export perfectly.

---

## 🚀 Coming Soon: Advanced Features

### Phase 1: Full Skill Export (8-12 hours)
- Pre-render all skills to video
- Composite with main video
- Perfect timing sync

### Phase 2: Auto-Captions (4-6 hours)
- Transcribe speech automatically
- Generate CaptionsPop at timestamps
- Word-level highlighting

### Phase 3: Beat Sync (8-10 hours)
- Detect beats in background music
- Sync text reveals to beats
- Match cuts to rhythm

### Phase 4: Smart Positioning (4-6 hours)
- Face detection in video
- Auto-position lower thirds below faces
- Smart text placement (avoid faces)

---

## 📊 Use Case Examples

### 1. Product Demo
- **Video**: Person explaining product
- **Graphics**: Feature callouts, benefit highlights, CTA
- **Duration**: 60-90 seconds
- **Skills**: LowerThird, CalloutBoxArrow, TextReveal, OutroCTA

### 2. Testimonial
- **Video**: Customer speaking
- **Graphics**: Name/company, key quote highlights
- **Duration**: 30-45 seconds
- **Skills**: LowerThird, CaptionsPop

### 3. Tutorial
- **Video**: Instructor teaching
- **Graphics**: Section titles, step numbers, tips
- **Duration**: 5-10 minutes
- **Skills**: IntroTitleCard, TextReveal, CalloutBoxArrow, OutroCTA

### 4. Social Media Clip
- **Video**: 15-second highlight
- **Graphics**: Bold captions, emoji reactions, CTA
- **Duration**: 15-30 seconds
- **Skills**: CaptionsPop, OutroCTA

---

## 💻 Test It Now!

### Quick Test (5 minutes):

1. **Get a test video**:
   - Record yourself talking (30 seconds)
   - Or use any talking head video you have
   - Or download from Pexels: https://www.pexels.com/search/videos/interview/

2. **Use this prompt**:
```
Add motion graphics to this talking head video:

1. Play the video from start to end on main track
2. At 2 seconds: Add LowerThird with "Your Name - Your Title"
3. At 10 seconds: Add CaptionsPop with "Key Point!" in bold
4. At 20 seconds: Add TextReveal with "Important Insight"
5. At start: Add IntroTitleCard "My Video"
6. At end: Add OutroCTA "Learn More"

Style: Dark theme, blue accents, professional look.
```

3. **Generate and preview**:
   - Upload video to DraftCut
   - Paste prompt
   - Generate
   - Watch in editor preview!

---

## 🎬 Bottom Line

**Yes! You can add motion graphics to talking head videos.**

**Current Status:**
- ✅ Works perfectly in editor preview (Remotion Player)
- ⚠️ Export has placeholders (coming soon)
- ✅ All 6 skill types available
- ✅ AI can intelligently place graphics

**Best Use Cases:**
1. Interviews with lower thirds
2. Presentations with section titles
3. Testimonials with quote highlights
4. Tutorials with step callouts
5. Social media clips with bold captions

**Recommendation:** Start using it now for previews and planning. Full export support coming soon!

---

**Want me to generate an example with your video?** Upload a talking head video and I'll create a prompt with perfect timing! 🎥✨
