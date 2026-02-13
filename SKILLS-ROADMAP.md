# DraftCut Skills Roadmap

Comprehensive list of video skills to implement with proper export rendering.

## Priority 1: Core Text & Typography (Most Requested)

### ✅ TextReveal
**Status**: Exists, needs export rendering
**Use Case**: Animated text reveals with multiple styles
**Props**: text, style (typewriter/fadeIn/slideUp/wordPop/glitch), fontSize, color, align
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ IntroTitleCard
**Status**: Exists, needs export rendering
**Use Case**: Full-screen animated title cards for video intros
**Props**: title, subtitle, logoAssetId, backgroundColor, colors
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ OutroCTA
**Status**: Exists, needs export rendering
**Use Case**: Call-to-action with pulsing button for video endings
**Props**: heading, ctaText, url, logoAssetId, colors
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ LowerThird
**Status**: Exists, needs export rendering
**Use Case**: Name/title bars for speaker identification
**Props**: name, title, position, backgroundColor, textColor
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ CaptionsPop
**Status**: Exists, needs export rendering
**Use Case**: Word-by-word animated captions synced to voiceover
**Props**: captions array with timing, fontSize, color, position
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ CalloutBoxArrow
**Status**: Exists, needs export rendering
**Use Case**: Highlight specific screen regions with arrows/boxes
**Props**: text, targetX/Y, boxWidth/Height, arrowPosition, colors
**Export**: Render frame-by-frame to canvas using Remotion Player

### ✅ ImageSlideshow
**Status**: **WORKING** - Only skill with proper export
**Use Case**: Animated image slideshow with Ken Burns effects
**Props**: slides array with kenBurns effects, captions, colors
**Export**: Already implemented in mediarecorder-exporter.ts

## Priority 2: Advanced Text Effects

### ❌ KineticTypography (NEW)
**Status**: Not created yet
**Use Case**: Word-by-word reveal with bounce, scale, rotation effects
**Props**: text, animationStyle (bounce/scale/rotate/slide), timing (word/letter), colors
**Export**: Render using Remotion Player with spring() animations
**Example**: "Make videos like these / in ChatCut / with one prompt" (each phrase animates in)

### ❌ TypewriterText (NEW)
**Status**: Not created yet (similar to TextReveal typewriter mode)
**Use Case**: Simulated typing effect with cursor
**Props**: text, typingSpeed, cursorBlink, fontSize, color
**Export**: Render frame-by-frame showing progressive text reveal

### ❌ TextMaskReveal (NEW)
**Status**: Not created yet
**Use Case**: Text revealed by moving shape/gradient mask
**Props**: text, maskType (circle/rectangle/gradient), maskDirection, colors
**Export**: Use canvas clipping/masking for frame-by-frame render

### ❌ GlitchText (NEW)
**Status**: Not created yet
**Use Case**: Cyberpunk/tech style glitch effect on text
**Props**: text, intensity, rgbOffset, flickerSpeed, colors
**Export**: Apply RGB channel offset and distortion per frame

## Priority 3: Graphic Elements

### ❌ TerminalWindow (NEW)
**Status**: Not created yet
**Use Case**: macOS/Linux terminal with typing animation and 3D rotation
**Props**: command, output, theme (light/dark), rotationY, slideDirection
**Export**: Render styled terminal div with CSS transforms to canvas
**Example**: Terminal sliding up with "no claude code, no problem"

### ❌ BrandLogo (NEW)
**Status**: Not created yet
**Use Case**: Animated logo with bounce, pulse, or slide entrance
**Props**: logoAssetId, animationType (bounce/pulse/slide/rotate), scale, position
**Export**: Render image with transform animations

### ❌ ProgressBar (NEW)
**Status**: Not created yet
**Use Case**: Animated progress/loading bars
**Props**: progress (0-100), color, backgroundColor, label, animated
**Export**: Draw rectangle with width animated via interpolate()

### ❌ ShapesAndIcons (NEW)
**Status**: Not created yet
**Use Case**: Animated circles, arrows, checkmarks, X marks
**Props**: shapeType, size, color, animationType (draw/scale/bounce)
**Export**: SVG path animation or canvas drawing

### ❌ CountUpNumber (NEW)
**Status**: Not created yet
**Use Case**: Animated number counter (0 → 1000)
**Props**: from, to, duration, suffix, fontSize, color
**Export**: Interpolate number value per frame

## Priority 4: Transitions & Effects

### ❌ GlitchTransition (NEW)
**Status**: Not created yet
**Use Case**: RGB distortion transition between scenes
**Props**: intensity, direction, duration
**Export**: Apply RGB channel offset during transition frames

### ❌ ClockWipeTransition (NEW)
**Status**: Not created yet
**Use Case**: Radial sweep reveal like clock hand
**Props**: startAngle, endAngle, clockwise, duration
**Export**: Use canvas arc clipping for radial wipe

### ❌ PixelateTransition (NEW)
**Status**: Not created yet
**Use Case**: Digital mosaic dissolution
**Props**: pixelSize, duration
**Export**: Downsample and scale up canvas for pixelation

### ❌ ChromaticAberration (NEW)
**Status**: Not created yet
**Use Case**: RGB color separation effect
**Props**: offset, angle
**Export**: Render RGB channels with offset

## Priority 5: Data Visualization

### ❌ BarChart (NEW)
**Status**: Not created yet
**Use Case**: Animated bar chart
**Props**: data array, labels, colors, animated
**Export**: Draw bars with height animated via interpolate()

### ❌ LineChart (NEW)
**Status**: Not created yet
**Use Case**: Animated line/area chart
**Props**: data array, color, fill, animated
**Export**: Draw path with progressive reveal

### ❌ PieChart (NEW)
**Status**: Not created yet
**Use Case**: Animated pie/donut chart
**Props**: data array, colors, donut (boolean)
**Export**: Draw arcs with angle animated via interpolate()

## Implementation Strategy

### Phase 1: Fix Export Rendering for Existing Skills (1-2 days)
1. Implement `renderSkillToCanvas()` helper in `mediarecorder-exporter.ts`
2. Use hidden div + Remotion Player to render each skill frame-by-frame
3. Capture rendered frames to canvas using `html2canvas` or similar
4. Enable export for: TextReveal, IntroTitleCard, OutroCTA, LowerThird, CaptionsPop, CalloutBoxArrow

### Phase 2: Create Priority Skills (2-3 days)
1. **TerminalWindow** - For code demo videos
2. **KineticTypography** - For engaging text animations
3. **BrandLogo** - For professional branding
4. **TypewriterText** - For storytelling

### Phase 3: Advanced Effects (3-4 days)
1. Transitions (Glitch, ClockWipe, Pixelate, ChromaticAberration)
2. Data viz (BarChart, LineChart, PieChart)
3. Shape animations

### Phase 4: AI Prompt Updates
1. Update `prompt.ts` to include all skills with examples
2. Provide use case guidance for each skill
3. Add motion graphics best practices from Remotion docs

## Export Rendering Architecture

### Current (Broken):
```javascript
// mediarecorder-exporter.ts line 402
ctx.fillText(`${clip.skillType} skill`, ...); // Debug placeholder!
```

### Target (Working):
```javascript
async function renderSkillClip(ctx, clip, clipTime, frame, spec, ...) {
  if (clip.skillType === 'ImageSlideshow') {
    // Already working
    await renderImageSlideshowToCanvas(...);
  } else {
    // NEW: Render all other skills via Remotion Player
    await renderRemotionSkillToCanvas(ctx, clip, frame, spec);
  }
}

async function renderRemotionSkillToCanvas(ctx, clip, frame, spec) {
  // 1. Create hidden container div
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = `${spec.canvas.width}px`;
  container.style.height = `${spec.canvas.height}px`;
  document.body.appendChild(container);

  // 2. Render Remotion Player to container
  const root = ReactDOM.createRoot(container);
  const skillDef = SKILL_REGISTRY[clip.skillType];
  root.render(
    <Player
      component={skillDef.component}
      inputProps={{ ...clip.skillProps, assetBlobUrls }}
      durationInFrames={Math.ceil(clip.duration * spec.canvas.fps)}
      fps={spec.canvas.fps}
      compositionWidth={spec.canvas.width}
      compositionHeight={spec.canvas.height}
      initialFrame={frame}
      controls={false}
      autoPlay={false}
    />
  );

  // 3. Wait for render
  await new Promise(resolve => requestAnimationFrame(resolve));

  // 4. Capture to canvas
  await captureElementToCanvas(container, ctx);

  // 5. Cleanup
  root.unmount();
  document.body.removeChild(container);
}
```

## Success Metrics

- [ ] All 6 existing skills export correctly (no debug placeholders)
- [ ] TerminalWindow skill created and working
- [ ] KineticTypography skill created and working
- [ ] Can recreate the ChatCut demo video from user's example
- [ ] Export time < 2x video duration
- [ ] Preview matches export 1:1

## Resources

- [Remotion Skills 2026](https://www.remotion.dev/docs/ai/claude-code)
- [Remotion Text Animations](https://github.com/remotion-dev/skills/blob/main/skills/remotion/rules/text-animations.md)
- [Motion Graphics Best Practices](https://www.dplooy.com/blog/claude-code-video-with-remotion-best-motion-guide-2026)
- [Free Remotion Templates](https://www.reactvideoeditor.com/remotion-templates)
