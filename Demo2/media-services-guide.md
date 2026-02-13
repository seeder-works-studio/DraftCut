# Media Services Guide: Stock Images, Music & Voiceover

This guide shows how to add stock images, background music, sound effects, and voiceovers to your videos using the **chat panel** (safer and more controlled) or during initial generation.

---

## 🖼️ Stock Images (Pexels)

### **Setup:**

1. Get free Pexels API key: https://www.pexels.com/api/
2. Go to Settings → Media Services
3. Add your Pexels API key

### **Method 1: Via Chat Panel** (✅ Recommended - Safer)

**After generating your initial video**, use chat to add stock images:

```
"Add 3 stock images of coffee shops"
"Find stock photos of nature and add them to the slideshow"
"Replace the current images with stock images of technology"
"Add stock images of: sunset, beach, ocean waves"
```

**Why this is safer:**
- You see the video first
- Add only what's needed
- Iterate based on results
- More control over selection

### **Method 2: During Initial Generation**

Include in your prompt:
```
"Create a promo video about coffee. Use stock images of coffee shops, baristas, and espresso machines."
```

The system will:
1. Search Pexels for relevant images
2. Download top 5 matches per topic
3. Add them to your assets
4. Use them in the video

### **Example Chat Commands:**

```
✅ "Add stock images of workspace, laptop, coffee"
✅ "Find 5 stock photos of happy people"
✅ "Replace image 1 with stock image of sunset"
✅ "Add Pexels photos about productivity"
```

---

## 🎵 Background Music

### **Setup:**

**Option A: Beatoven AI** (✅ Recommended - Best Quality)
1. Get API key: https://www.beatoven.ai/
2. Settings → Media Services → Beatoven API Key

**Option B: Replicate** (Backup)
1. Get API key: https://replicate.com/
2. Settings → Media Services → Replicate API Key

### **Method 1: Via Chat Panel** (✅ Recommended)

```
"Add upbeat background music"
"Generate energetic music for this video"
"Add calm, relaxing background music"
"Create electronic music for the intro"
"Add music with genre: pop, mood: happy, duration: 20s"
```

**Advanced with Beatoven:**
```
"Generate music: upbeat, energetic, 30 seconds, corporate style"
"Add background music with tempo: fast, mood: inspiring"
```

### **Method 2: During Initial Generation**

Music is **automatically generated** if you have Beatoven or Replicate API key configured.

The system creates:
- Upbeat background music matching your video's vibe
- Duration matching your video length
- For website-based videos: music matching brand personality

### **Current Capabilities:**

**Beatoven AI:**
- Custom music composition
- Multiple genres: corporate, pop, electronic, ambient, etc.
- Mood control: happy, sad, energetic, calm, etc.
- Tempo control
- High quality MP3 output
- Commercial use allowed

**Replicate (Fallback):**
- AI-generated music
- Basic genre/mood control
- WAV output
- 20-second clips

### **Example Chat Commands:**

```
✅ "Add energetic background music"
✅ "Generate calm music for 15 seconds"
✅ "Create upbeat corporate music"
✅ "Add music with happy mood"
```

---

## 🎤 Voiceover & Narration

### **Setup:**

**ElevenLabs** (Realistic AI voices)
1. Get API key: https://elevenlabs.io/
2. Settings → Media Services → ElevenLabs API Key

### **Method 1: Via Chat Panel** (✅ Recommended)

```
"Add voiceover: 'Welcome to our product demo'"
"Generate narration for the video"
"Add voice narration with script: 'Introducing the future of AI video editing'"
"Create voiceover with voice: Rachel, text: 'Get started today'"
```

**Advanced:**
```
"Add voiceover at 5 seconds: 'This is amazing'"
"Generate narration for each slide"
"Create voiceover with timestamps:
 0-3s: 'Welcome'
 3-8s: 'Here are our features'
 8-12s: 'Try it today'"
```

### **Method 2: Auto-Captions from Voiceover**

Once you have voiceover, sync captions:
```
"Add captions synced to the voiceover"
"Generate captions from the narration"
"Show subtitles for the voice"
```

### **Available Voices:**

ElevenLabs offers:
- **Rachel** - Professional female (recommended for corporate)
- **Adam** - Professional male
- **Bella** - Friendly female
- **Antoni** - Narrative male
- **Elli** - Young female
- **Josh** - Young male
- **Arnold** - Deep male
- **Domi** - Strong female
- **Sam** - Dynamic male

### **Example Chat Commands:**

```
✅ "Add voiceover: 'Welcome to DraftCut'"
✅ "Generate narration with Rachel's voice"
✅ "Create voiceover at 3 seconds: 'Amazing features'"
✅ "Add voice with text: 'Get started today', voice: Adam"
```

---

## 🔊 Sound Effects

### **Via Chat Panel:**

```
"Add whoosh sound effect at 2 seconds"
"Add applause sound when the CTA appears"
"Add transition sound effects between slides"
"Add click sound for the button"
```

**Note:** Sound effects currently require manual upload or integration with Freesound.org API (coming soon).

---

## 📋 Complete Workflow Examples

### **Example 1: Product Promo (All Media)**

**Step 1: Initial Generation**
```
Create a 20-second product promo
```

**Step 2: Add Stock Images via Chat**
```
"Add stock images of: workspace, laptop, coffee cup"
```

**Step 3: Add Background Music**
```
"Add upbeat corporate background music"
```

**Step 4: Add Voiceover**
```
"Add voiceover at start: 'Introducing the future of productivity'"
"Add voiceover at 10s: 'Get started free today'"
```

**Step 5: Polish**
```
"Make the text bigger"
"Change CTA button to 'Try Free'"
```

---

### **Example 2: Website Video (Automatic)**

**Prompt:**
```
Create a promo video for gruns.co
```

**Automatic actions:**
- ✅ Scrapes website for images
- ✅ Extracts brand colors
- ✅ Generates matching background music
- ✅ Creates video

**Then via chat, add:**
```
"Add 3 more stock images of healthy food"
"Add voiceover: 'Nutrition for real life'"
```

---

### **Example 3: Tutorial Video**

**Step 1: Upload screen recording**
- Upload your tutorial video

**Step 2: Generate via prompt**
```
Create a tutorial video with this screen recording
```

**Step 3: Via chat, add:**
```
"Add voiceover explaining each step"
"Add stock images for the intro"
"Add background music (low volume, ambient)"
"Add captions synced to voiceover"
```

---

## ⚙️ Settings Configuration

### **Settings → Media Services**

Configure all API keys in one place:

```
┌─────────────────────────────────────┐
│ Media Services Configuration        │
├─────────────────────────────────────┤
│                                     │
│ 🖼️ Stock Images                    │
│   Pexels API Key: [____________]   │
│   Get key: pexels.com/api          │
│                                     │
│ 🎵 Background Music                │
│   Beatoven API Key: [__________]   │
│   Get key: beatoven.ai             │
│                                     │
│   Replicate API Key: [_________]   │
│   Get key: replicate.com           │
│                                     │
│ 🎤 Voiceover & Narration           │
│   ElevenLabs API Key: [________]   │
│   Get key: elevenlabs.io           │
│                                     │
│ 🎬 Video Analysis (Gemini)         │
│   Gemini Video API Key: [______]   │
│   Get key: ai.google.dev           │
│                                     │
└─────────────────────────────────────┘
```

---

## 💡 Best Practices

### **Use Chat Panel for:**
✅ Adding stock images (after seeing what's needed)
✅ Adding/changing background music
✅ Adding voiceover/narration
✅ Fine-tuning media placement
✅ Iterating based on results

### **Use Initial Prompt for:**
✅ Website scraping (automatic images + music)
✅ Basic structure and content
✅ Overall video concept

### **Safety Tips:**

1. **Generate basic video first** - See what you have before adding media
2. **Add media iteratively** - One thing at a time via chat
3. **Preview after each change** - Make sure it looks good
4. **Use specific prompts** - "Add stock images of workspace" vs "add images"
5. **Check asset count** - Too many assets slow down export

---

## 🎯 Quick Reference

### **Stock Images (Pexels):**
```
"Add stock images of [topic]"
"Find [N] stock photos of [query]"
"Replace images with stock images of [topic]"
```

### **Music (Beatoven/Replicate):**
```
"Add [mood] background music"
"Generate music with [genre], [mood], [duration]s"
"Change music to [mood/genre]"
```

### **Voiceover (ElevenLabs):**
```
"Add voiceover: '[script]'"
"Generate narration with voice: [name]"
"Add voice at [N]s: '[text]'"
```

### **Combined:**
```
"Add stock images of coffee, background music (calm), and voiceover: 'Welcome to our cafe'"
```

---

## 📚 API Key Links

- **Pexels**: https://www.pexels.com/api/ (FREE - 200 requests/hour)
- **Beatoven AI**: https://www.beatoven.ai/ (Paid - best music quality)
- **Replicate**: https://replicate.com/ (Pay-per-use)
- **ElevenLabs**: https://elevenlabs.io/ (Free tier available)
- **Gemini Video**: https://ai.google.dev/ (Free tier available)

---

## 🔧 Implementation Status

| Feature | Status | Via Chat | Auto |
|---------|--------|----------|------|
| Stock Images (Pexels) | ✅ Ready | ✅ | ⚠️ |
| Background Music (Beatoven) | ✅ Working | ✅ | ✅ |
| Background Music (Replicate) | ✅ Working | ✅ | ✅ |
| Voiceover (ElevenLabs) | ⚠️ Partial | ⚠️ | ❌ |
| Auto-Captions | ✅ Working | ✅ | ❌ |
| Sound Effects | ❌ Planned | ❌ | ❌ |
| Video Analysis (Gemini) | ✅ Working | ✅ | ❌ |

✅ = Fully working
⚠️ = Partially implemented
❌ = Not yet available

---

**Recommended Workflow: Generate → Preview → Add Media via Chat → Export** 🎬
