# Video Generation Improvements

## Problem
The original video generation system created **static slideshows** where images just appeared on screen for a few seconds with no motion or visual interest. Videos felt boring and unprofessional.

## Solution
Transformed the system into a **dynamic motion graphics generator** using Remotion animation primitives and an enhanced AI prompt that guides the creation of engaging, animated videos.

## Key Changes

### 1. Animation Library (`src/lib/animations/primitives.ts`)
Created a comprehensive library of reusable animation primitives based on Remotion best practices:

**Entrance Animations:**
- `fadeIn()` - Smooth opacity fade
- `scaleIn()` - Spring-based scale animation
- `slideInFrom[Left|Right|Top|Bottom]()` - Directional slides
- `bounceIn()` - Bouncy entrance
- `elasticIn()` - Elastic spring effect

**Exit Animations:**
- `fadeOut()` - Smooth fade out
- `scaleOut()` - Scale down exit
- `slideOutTo[Left|Right]()` - Directional exits

**Ken Burns Effects (for images):**
- `kenBurnsZoomIn()` - Slow zoom into image
- `kenBurnsZoomOut()` - Slow zoom out of image
- `kenBurnsPanRight()` - Pan across image right
- `kenBurnsPanLeft()` - Pan across image left
- Custom `kenBurns()` for full control

**Transitions:**
- `crossFade()` - Smooth crossfade between elements
- `wipeLeft()` - Wipe transition
- `circularReveal()` - Circular reveal effect

**Continuous Animations:**
- `pulse()` - Continuous pulse effect
- `rotate()` - Rotation animation
- `float()` - Floating motion

### 2. New Skills

#### **ImageSlideshow** (`src/skills/ImageSlideshow.tsx`)
**MOST IMPORTANT**: Replaces static image clips with cinematic Ken Burns-animated slideshows.

Features:
- Smooth crossfade transitions between images
- Ken Burns effects (zoom in, zoom out, pan left, pan right)
- Optional captions per slide
- Configurable transition duration
- Proper asset URL resolution

**Before:**
```json
{
  "type": "image",
  "assetId": "img1",
  "duration": 5
}
```
❌ Static image, no motion

**After:**
```json
{
  "type": "skill",
  "skillType": "ImageSlideshow",
  "skillProps": {
    "slides": [
      { "assetId": "img1", "duration": 5, "kenBurns": "zoomIn", "caption": "Feature 1" },
      { "assetId": "img2", "duration": 5, "kenBurns": "panRight", "caption": "Feature 2" },
      { "assetId": "img3", "duration": 5, "kenBurns": "zoomOut", "caption": "Feature 3" }
    ]
  }
}
```
✅ Dynamic slideshow with Ken Burns effects and smooth transitions

#### **TextReveal** (`src/skills/TextReveal.tsx`)
Animated text reveals with multiple styles:
- **typewriter** - Character-by-character typewriter effect
- **fadeIn** - Simple fade in
- **slideUp** - Slide up with spring animation
- **wordPop** - Words pop in one by one
- **glitch** - Glitch effect for tech/cyberpunk vibes

### 3. Enhanced Existing Skills

#### **IntroTitleCard** (Upgraded)
Before: Basic slide-up animation
After:
- Multi-stage spring animations for title and subtitle
- Rotating logo entrance
- Animated accent bars and corner decorations
- Pulsing text effect
- Smooth exit animation
- Glowing text shadows

#### **OutroCTA** (Upgraded)
Before: Basic fade and scale
After:
- Cascading animations (logo → heading → button)
- Continuous pulsing button with glow effect
- Animated shimmer overlay on button
- Decorative dots with staggered entrance
- Professional button styling with shadows

### 4. Improved AI Prompt (`src/lib/claude/prompt.ts`)

**Critical Changes:**
1. **Emphasizes motion** - "You are a professional motion graphics designer AI that creates DYNAMIC, ANIMATED videos"
2. **Bans static images** - "NEVER place static images directly on video track - use ImageSlideshow skill instead"
3. **Detailed skill documentation** - Each skill has usage examples and when to use it
4. **Ken Burns guidance** - Explicit instructions on varying Ken Burns effects
5. **Example structure** - Complete JSON example showing proper ImageSlideshow usage
6. **Motion graphics strategy** - Step-by-step guide for creating dynamic videos

**Key Prompt Sections:**
- 🎬 FOR IMAGES: How to use ImageSlideshow (fixes the static image problem)
- 🎬 FOR VIDEOS: How to layer skills over video
- 🎬 LAYERING STRUCTURE: Proper track organization
- 🎬 REQUIRED STRUCTURE: Intro → Content → Outro timing
- 🎬 ADVANCED TECHNIQUES: Layering multiple skills

### 5. Asset URL Resolution
Updated components to properly resolve asset URLs:
- Skills receive `assetBlobUrls` map from preview component
- ImageSlideshow resolves asset IDs to blob URLs
- IntroTitleCard and OutroCTA handle logo assets correctly
- Fallback to asset ID if blob URL not found

## How It Works

### Video Generation Flow
1. **User uploads images** → Stored in IndexedDB
2. **User enters prompt** → Sent to AI with system prompt
3. **AI generates ProjectSpec** → Uses ImageSlideshow skill for images, not static clips
4. **Editor loads project** → Blob URLs created for all assets
5. **Preview renders** → Skills receive assetBlobUrls map
6. **ImageSlideshow resolves URLs** → Displays images with Ken Burns effects
7. **Smooth crossfades** → Transitions between slides

### Example: 4-Image Video

**User uploads:** 4 screenshots
**User prompt:** "Create a product demo showing our features"

**AI generates:**
```json
{
  "composition": {
    "tracks": [
      {
        "id": "track-video",
        "type": "video",
        "clips": []
      },
      {
        "id": "track-overlay",
        "type": "overlay",
        "clips": [
          {
            "id": "intro",
            "type": "skill",
            "skillType": "IntroTitleCard",
            "startTime": 0,
            "duration": 3,
            "skillProps": {
              "title": "Our Product",
              "subtitle": "Feature Showcase"
            }
          },
          {
            "id": "slideshow",
            "type": "skill",
            "skillType": "ImageSlideshow",
            "startTime": 3,
            "duration": 20,
            "skillProps": {
              "slides": [
                { "assetId": "img1", "duration": 5, "kenBurns": "zoomIn", "caption": "Dashboard View" },
                { "assetId": "img2", "duration": 5, "kenBurns": "panRight", "caption": "Analytics" },
                { "assetId": "img3", "duration": 5, "kenBurns": "zoomOut", "caption": "Settings" },
                { "assetId": "img4", "duration": 5, "kenBurns": "panLeft", "caption": "Reports" }
              ],
              "transitionDuration": 20
            }
          },
          {
            "id": "outro",
            "type": "skill",
            "skillType": "OutroCTA",
            "startTime": 23,
            "duration": 5,
            "skillProps": {
              "heading": "Get Started Today",
              "ctaText": "Sign Up Free"
            }
          }
        ]
      }
    ]
  }
}
```

**Result:** 28-second video with:
- 3s animated intro title card
- 20s dynamic slideshow with Ken Burns effects and smooth crossfades
- 5s animated outro with pulsing CTA button

## Testing

To test the improvements:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Run dev server:**
   ```bash
   npm run dev
   ```

3. **Generate a video:**
   - Upload 3-5 images
   - Enter a prompt like "Create a 30-second product showcase"
   - Click "Generate Video Draft"
   - Observe the video in the editor

4. **What to look for:**
   - Images should animate with Ken Burns effects (zoom/pan)
   - Smooth crossfade transitions between images
   - No static "stuck" images
   - Dynamic intro and outro with animations
   - Text should animate in smoothly

## Before vs After

### Before ❌
- Static images appearing for X seconds
- No transitions between images
- Boring, slideshow-style videos
- No motion or visual interest
- Basic fade-in on intro/outro

### After ✅
- Ken Burns effects on all images (zoom, pan)
- Smooth crossfade transitions
- Professional motion graphics
- Constant motion throughout video
- Spring-based animations on all skills
- Pulsing buttons, glowing effects
- Rotating logos, sliding text
- Cinema-quality output

## Future Improvements (Task #5 - Agentic System)

The agentic video creation system (currently pending) will:
1. **Initial generation** - AI creates basic video structure
2. **Analysis phase** - AI checks for static content, pacing issues
3. **Enhancement phase** - AI adds more skills and effects
4. **Refinement phase** - AI adjusts timing and transitions
5. **Conversational iteration** - User chats to refine video

This will work like Claude Code, where the system iteratively improves the video through multiple passes and user feedback.

## Technical Notes

### Performance
- All animations use Remotion's spring() and interpolate() for smooth 60fps rendering
- Ken Burns effects calculated per-frame for smooth motion
- Crossfades use overlapping opacity transitions

### Compatibility
- Works with all AI providers (Claude, Gemini, OpenAI, etc.)
- Browser-based rendering (no server required)
- Responsive preview scaling

### Extensibility
- Easy to add new skills using animation primitives
- Composable animations (mix and match)
- Consistent API across all skills

## References

- [Remotion Skills Repository](https://github.com/remotion-dev/skills)
- [Motion Graphics for Developers](https://tekkix.com/articles/ai/2026/02/motion-graphics-for-developers-remotion-skill)
- [Remotion Documentation](https://www.remotion.dev/)

## Summary

These changes transform DraftCut from a basic slideshow generator into a **professional motion graphics tool**. The AI now understands how to create engaging videos with constant motion, smooth transitions, and cinema-quality effects—all generated automatically from a simple text prompt.
