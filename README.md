# DraftCut 🎬

> AI-powered video editor that runs entirely in your browser

DraftCut is a web-based video editor where you describe what you want and AI generates a complete video with motion graphics, animations, and professional effects—all without sending your media to any server.

## ✨ Features

- **AI Video Generation** - Describe your video concept, upload assets, and let AI create the timeline
- **Agentic Refinement** 🆕 - AI iteratively analyzes and improves video quality (like Claude Code for videos)
- **Dynamic Motion Graphics** - Ken Burns effects, crossfade transitions, animated text reveals
- **Professional Skills** - Intro title cards, lower thirds, caption animations, outro CTAs
- **Browser-Based Export** - Export to YouTube-compatible WebM directly in your browser
- **100% Private** - All assets stored locally in IndexedDB, nothing leaves your device
- **Multiple AI Providers** - Claude, Gemini, OpenAI, OpenRouter, Cerebras support

## 🚀 Quick Start

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd DraftCut
   npm install
   ```

2. **Add API keys** (see [API-KEYS.md](./API-KEYS.md)):
   - Get a Claude API key from https://console.anthropic.com
   - Or use Gemini, OpenAI, OpenRouter, or Cerebras

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   - Navigate to http://localhost:3000
   - Upload images/videos
   - Enter a prompt like: *"Create a 30-second product showcase with Ken Burns effects and professional intro"*
   - Click "Generate Video"

5. **Export**:
   - Review in editor
   - Click "Export" → "WebM Video"
   - Upload to YouTube or share

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete architecture and development guide
- **[AGENTIC-VIDEO-SYSTEM.md](./AGENTIC-VIDEO-SYSTEM.md)** 🆕 - AI-powered iterative video refinement
- **[API-KEYS.md](./API-KEYS.md)** - How to get and configure API keys
- **[TESTING-EXPORT.md](./TESTING-EXPORT.md)** - Export functionality testing guide
- **[DIFFUSION-STUDIOS-INTEGRATION.md](./DIFFUSION-STUDIOS-INTEGRATION.md)** - Future MP4 export integration (pending)

## 🎨 What Can You Create?

### Image Slideshows with Ken Burns Effects
```
Create a 30-second travel video with cinematic zoom and pan effects on these beach photos. Add a vibrant intro and call-to-action at the end.
```

### Product Showcases
```
Make a 45-second product demo highlighting these 5 features. Use clean animations and professional lower thirds for each feature name.
```

### Social Media Content
```
Create a 15-second Instagram-ready video with bold text reveals and energetic transitions between these lifestyle images.
```

### Video Compilations
```
Combine these 3 video clips into a 60-second highlight reel with smooth crossfades and captions.
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (static export)
- **Deployment**: Cloudflare Workers + Pages
- **Video Engine**: Remotion 4
- **Export**: Browser MediaRecorder API (WebM)
- **AI**: Anthropic SDK, OpenAI-compatible APIs
- **State**: Zustand
- **Storage**: IndexedDB
- **UI**: React 19, Tailwind CSS 4, shadcn/ui

## 📦 Available Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build (outputs to ./out)
npm run start        # Serve production build locally
npm run lint         # Lint code
npm run deploy       # Deploy to Cloudflare Workers
npx playwright test  # Run E2E tests
```

## 🎯 Current Status

### ✅ Implemented
- AI video generation from prompts and assets
- **Agentic video refinement system** 🆕 - Iterative quality improvement
- ImageSlideshow skill with Ken Burns effects (zoom, pan)
- Text reveal animations (typewriter, fade, slide, pop, glitch)
- Enhanced intro/outro cards with animations
- Timeline editor with drag-and-drop
- WebM video export (YouTube-compatible)
- Multiple AI provider support
- Local-first storage (IndexedDB)

### ⚠️ Partially Implemented
- **Audio tracks** - Not yet mixed in export (preview works)
- **Skill export** - Only ImageSlideshow fully exports; others render as placeholders
- **MP4 export** - Foundation in place, full implementation pending

### 📋 Roadmap
- [ ] Audio mixing in export (Web Audio API)
- [ ] Full Remotion skill rendering in export
- [ ] Version history for agentic iterations
- [ ] Multi-provider support for agentic mode (Gemini, OpenAI)
- [ ] MP4 export with Diffusion Studios
- [ ] Auto-captions with ElevenLabs
- [ ] AI music generation (Replicate/Beatoven) - Already supported!
- [ ] Website scraping for brand kits - Already supported!
- [ ] 4K export support

## 🧪 Testing

Run end-to-end tests with Playwright:

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test e2e/generate-demo.spec.ts

# Debug mode
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed
```

See [TESTING-EXPORT.md](./TESTING-EXPORT.md) for detailed export testing instructions.

## 🏗️ Architecture

```
User Prompt + Assets
       ↓
   AI Provider (Claude/Gemini/etc.)
       ↓
   ProjectSpec JSON
       ↓
   Remotion Player (Preview)
       ↓
   Timeline Editor
       ↓
   MediaRecorder Export (WebM)
       ↓
   Download / YouTube Upload
```

All data stored locally in IndexedDB:
- **projects** - Saved video projects
- **assets** - Media file blobs
- **settings** - API keys (encrypted)

## 🔒 Privacy

- **No server uploads** - Assets never leave your browser
- **API keys stored locally** - Encrypted in IndexedDB
- **AI requests only** - Only prompts sent to AI providers, not media files
- **Open source** - Inspect the code yourself

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npx playwright test`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

[MIT License](./LICENSE)

## 🙏 Acknowledgments

- **Remotion** - Video composition framework
- **Anthropic** - Claude AI API
- **shadcn/ui** - UI component library
- **Cloudflare** - Deployment platform

## 💬 Support

- **Issues**: https://github.com/your-org/draftcut/issues
- **Discussions**: https://github.com/your-org/draftcut/discussions
- **Documentation**: See [CLAUDE.md](./CLAUDE.md)

---

Built with ❤️ by the DraftCut team

**🎬 Start creating videos with AI today!**
