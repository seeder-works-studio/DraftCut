# Text Overlays on Video - Quick Fix Guide

## Problem

When you add text skills over video, they show **solid backgrounds** that block the video underneath, showing only white/colored backgrounds instead of text over video.

## Solution

Use **`backgroundColor: "transparent"`** for text overlays on video.

## Which Skills to Use

### ✅ For Text ON TOP of Video (Overlays)

**TextReveal** - Best for headlines over video
```json
{
  "type": "skill",
  "skillType": "TextReveal",
  "skillProps": {
    "text": "Your headline here",
    "style": "wordPop",
    "fontSize": 96,
    "color": "#ffffff",
    "backgroundColor": "transparent",  // ← CRITICAL!
    "align": "center",
    "verticalAlign": "center"
  }
}
```

**KineticTypography** - Best for multi-line text over video
```json
{
  "type": "skill",
  "skillType": "KineticTypography",
  "skillProps": {
    "lines": ["Line 1", "Line 2", "Line 3"],
    "animationStyle": "bounce",
    "fontSize": 96,
    "color": "#ffffff",
    "backgroundColor": "transparent",  // ← CRITICAL!
    "align": "center"
  }
}
```

**CaptionsPop** - Designed for video overlays (no background needed)
```json
{
  "type": "skill",
  "skillType": "CaptionsPop",
  "skillProps": {
    "captions": [{
      "text": "Your caption",
      "startTime": 0,
      "duration": 3
    }],
    "fontSize": 64,
    "color": "#ffffff",
    "position": "bottom"
  }
}
```

**LowerThird** - Designed for video overlays (works naturally)
```json
{
  "type": "skill",
  "skillType": "LowerThird",
  "skillProps": {
    "name": "John Doe",
    "title": "CEO",
    "position": "bottom-left",
    "backgroundColor": "#1a1a1a",
    "textColor": "#ffffff"
  }
}
```

### ❌ NOT for Video Overlays (Standalone Only)

**IntroTitleCard** - Always full-screen with solid background
- Designed as standalone intro card (0-3s)
- Cannot overlay on video
- Use BEFORE video starts or on empty track

**OutroCTA** - Always full-screen with solid background
- Designed as standalone outro (last 5-7s)
- Cannot overlay on video
- Use AFTER video ends or on empty track

## Examples

### ❌ WRONG - Blocks Video
```json
{
  "composition": {
    "tracks": [
      {
        "id": "track-video",
        "type": "video",
        "clips": [
          { "type": "video", "assetId": "vid1", "startTime": 0, "duration": 10 }
        ]
      },
      {
        "id": "track-overlay",
        "type": "overlay",
        "clips": [
          {
            "type": "skill",
            "skillType": "TextReveal",
            "startTime": 2,
            "duration": 4,
            "skillProps": {
              "text": "Headline",
              "backgroundColor": "#ffffff"  // ← BLOCKS VIDEO!
            }
          }
        ]
      }
    ]
  }
}
```

### ✅ CORRECT - Shows Text Over Video
```json
{
  "composition": {
    "tracks": [
      {
        "id": "track-video",
        "type": "video",
        "clips": [
          { "type": "video", "assetId": "vid1", "startTime": 0, "duration": 10 }
        ]
      },
      {
        "id": "track-overlay",
        "type": "overlay",
        "clips": [
          {
            "type": "skill",
            "skillType": "TextReveal",
            "startTime": 2,
            "duration": 4,
            "skillProps": {
              "text": "Headline",
              "fontSize": 96,
              "color": "#ffffff",
              "backgroundColor": "transparent"  // ← VIDEO SHOWS THROUGH!
            }
          }
        ]
      }
    ]
  }
}
```

## Common Video Structures

### Structure 1: Intro → Video with Text → Outro
```
Video track:  [           VIDEO (3s-18s)              ]
Overlay:      [INTRO] [TEXT OVER VIDEO] [TEXT] [OUTRO]
              0-3s    3s-8s             8s-13s  18-20s
```

```json
{
  "tracks": [
    {
      "id": "track-video",
      "clips": [
        { "type": "video", "assetId": "vid1", "startTime": 3, "duration": 15 }
      ]
    },
    {
      "id": "track-overlay",
      "clips": [
        {
          "skillType": "IntroTitleCard",
          "startTime": 0,
          "duration": 3,
          "skillProps": { "title": "My Video", "backgroundColor": "#1a1a1a" }
        },
        {
          "skillType": "TextReveal",
          "startTime": 5,
          "duration": 3,
          "skillProps": {
            "text": "Amazing Product",
            "backgroundColor": "transparent"  // Over video!
          }
        },
        {
          "skillType": "TextReveal",
          "startTime": 10,
          "duration": 3,
          "skillProps": {
            "text": "Key Features",
            "backgroundColor": "transparent"  // Over video!
          }
        },
        {
          "skillType": "OutroCTA",
          "startTime": 18,
          "duration": 2,
          "skillProps": { "heading": "Get Started", "backgroundColor": "#1a1a1a" }
        }
      ]
    }
  ]
}
```

### Structure 2: Video with Captions (Full Overlay)
```
Video track:  [         VIDEO (0-10s)          ]
Overlay:      [        CAPTIONS (0-10s)        ]
```

```json
{
  "tracks": [
    {
      "id": "track-video",
      "clips": [
        { "type": "video", "assetId": "vid1", "startTime": 0, "duration": 10 }
      ]
    },
    {
      "id": "track-overlay",
      "clips": [
        {
          "skillType": "CaptionsPop",
          "startTime": 0,
          "duration": 10,
          "skillProps": {
            "captions": [
              { "text": "Welcome to our product", "startTime": 0, "duration": 3 },
              { "text": "Here's how it works", "startTime": 3, "duration": 3 },
              { "text": "Try it today", "startTime": 6, "duration": 4 }
            ],
            "position": "bottom"
          }
        }
      ]
    }
  ]
}
```

## How to Fix Existing Videos

### Using Chat Panel:
```
"Make the TextReveal background transparent so it overlays on the video"
"Change all text overlays to use transparent backgrounds"
"Set TextReveal backgroundColor to transparent"
```

### Manual Editing:
1. Open the project spec JSON
2. Find the skill clip you want to overlay
3. Change `"backgroundColor": "#ffffff"` to `"backgroundColor": "transparent"`
4. Save and preview

## Quick Reference

| Skill | Overlay Mode | Standalone Mode |
|-------|--------------|-----------------|
| TextReveal | `backgroundColor: "transparent"` | `backgroundColor: "#1a1a1a"` |
| KineticTypography | `backgroundColor: "transparent"` | `backgroundColor: "#1a1a1a"` |
| CaptionsPop | Always overlay | N/A |
| LowerThird | Always overlay | N/A |
| IntroTitleCard | N/A | Always standalone |
| OutroCTA | N/A | Always standalone |
| ImageSlideshow | Can be both | Can be both |

## Tips

1. **Use CaptionsPop for video** - It's designed for overlays and handles timing well
2. **Use TextReveal for impact** - Great for single headlines over video
3. **Use KineticTypography for lists** - Perfect for multi-line overlays
4. **Keep IntroTitleCard/OutroCTA separate** - Use before/after video, not during

---

**The AI now knows these rules** - regenerate your video and it will use transparent backgrounds for text overlays on video! 🎬
