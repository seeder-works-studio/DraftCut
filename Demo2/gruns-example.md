# Gruns.co Video Example

## What ChatCut Did:
Created a promo video from just the URL `gruns.co` that:
- Scraped website images and screenshots
- Extracted brand colors (green + gold)
- Generated background music automatically
- Created professional text overlays

## How to Do This in DraftCut:

### Setup (one-time):
1. Go to Settings (gear icon)
2. Add your API keys:
   - **AI Provider**: Gemini (gemini-2.5-flash is fastest) or Claude
   - **Music**: Beatoven AI (recommended) or Replicate

### Create the Video:

**Option 1: Simple URL Prompt**
```
Create a promo video for gruns.co
```

**Option 2: Detailed Prompt**
```
Create a 20-second promo video for gruns.co highlighting their superfood gummies
```

**Option 3: Advanced (URL in Settings)**
1. Go to Settings > Website URL
2. Enter: `gruns.co`
3. Then prompt: `Create a promo video highlighting the key benefits`

## What Happens Automatically:

1. **Website Scraping**
   - Fetches gruns.co content
   - Extracts "Nutrition for real life", "60+ superfoods", etc.
   - Downloads hero images and product photos

2. **Brand Matching**
   - Detects green (#4A7C59) and gold (#F4C542) colors
   - Applies them to text, backgrounds, and accents

3. **Music Generation**
   - Creates upbeat background music matching the brand vibe
   - ~20 seconds to match video length

4. **AI Video Generation**
   - Uses website images in ImageSlideshow with Ken Burns effects
   - Creates text overlays with website copy
   - Uses IntroTitleCard with logo, OutroCTA for call-to-action
   - Large, centered text matching professional standards

## Expected Output:

Similar to ChatCut's Gruns video:
- Intro with Gruns logo on green background
- Website screenshots with "FUEL YOUR BEST SELF" overlay
- Bullet points: "60+ SUPERFOODS", "DELICIOUS GUMMIES", "30-DAY GUARANTEE"
- Closing with tagline and CTA

## Tips:

- **Images**: System downloads up to 5 images from website
- **Colors**: First 2 dominant colors become primary/secondary brand colors
- **Music**: Takes ~30-60 seconds to generate (Beatoven is faster)
- **Text**: AI extracts key phrases from website for captions

## Current Implementation:

All features are live in DraftCut:
- ✅ URL detection in prompts (no need to specify "scrape this")
- ✅ Website scraping via Cloudflare Worker (/api/scrape)
- ✅ Image downloading via CORS proxy (/api/proxy-image)
- ✅ Color extraction and brand kit auto-application
- ✅ Music generation (Beatoven + Replicate)
- ✅ Website context passed to AI for relevant copy
- ✅ Professional motion graphics with large, centered text

## Example Prompt for Gruns:

```
Create a 15-second promo video for gruns.co.
Use their website images and highlight their key benefits
like "60+ superfoods" and "delicious gummies".
End with a call-to-action.
```

The AI will:
1. Scrape gruns.co
2. Extract green/gold brand colors
3. Download product images
4. Generate upbeat music
5. Create video with:
   - IntroTitleCard: "Gruns" with logo
   - ImageSlideshow: Website screenshots with Ken Burns
   - TextReveal: "FUEL YOUR BEST SELF"
   - TextReveal or bullet list: Key benefits
   - OutroCTA: "Try Gruns Today"
