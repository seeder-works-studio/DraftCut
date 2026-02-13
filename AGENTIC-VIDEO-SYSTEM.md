# Agentic Video Creation System

## Overview

DraftCut now features an **agentic video creation system** that iteratively analyzes and improves video quality using AI. Inspired by coding agents like Claude Code, the system acts as an autonomous video editor that:

1. **Analyzes** the generated video for quality issues
2. **Identifies** problems (static content, poor pacing, missing effects)
3. **Refines** the video specification to fix issues
4. **Iterates** until reaching target quality score or max iterations

## How It Works

### Architecture

```
User Prompt + Assets
       ↓
   Initial AI Generation
       ↓
   ProjectSpec (v1)
       ↓
   ┌──────────────────┐
   │  Agent Loop      │
   │                  │
   │  1. Analyze      │ ← analyzeVideoQuality()
   │  2. Find Issues  │ ← Check static, pacing, motion
   │  3. Improve      │ ← update_video_spec tool
   │  4. Re-analyze   │ ← Calculate new score
   │  5. Repeat       │ ← Until score >= target
   └──────────────────┘
       ↓
   ProjectSpec (refined)
       ↓
   Editor / Export
```

### Agent Tools

The AI agent has access to these tools:

#### 1. `analyze_video`
Analyzes current video quality and returns detailed report:
- **Issues**: List of problems with severity (low/medium/high)
- **Score**: Quality score 0-100
- **Suggestions**: Actionable improvements

#### 2. `get_video_stats`
Returns statistics about the current video:
- Duration, FPS, resolution
- Track/clip/asset counts
- Skill usage breakdown

#### 3. `update_video_spec`
Updates the video specification with improvements:
- Takes complete ProjectSpec JSON
- Validates structure
- Returns success confirmation

#### 4. `complete_refinement`
Signals that refinement is complete:
- Used when quality target reached
- Or when no more improvements possible

### Quality Analysis

The system analyzes 5 dimensions of video quality:

#### 1. Static Content (-5 pts per issue)
**Critical**: Static image clips without motion
- ❌ **Bad**: Plain image clips that don't animate
- ✅ **Good**: ImageSlideshow with Ken Burns effects

#### 2. Pacing (-3 pts per issue)
**Important**: Clip duration and rhythm
- Long clips (>10s) feel slow
- Short clips (<2s) feel rushed
- Monotonous durations lack variety
- ✅ **Good**: Mix 3-5s clips with 6-10s clips

#### 3. Motion Graphics (-3 pts per issue)
**Important**: Dynamic animations and effects
- Missing Ken Burns effects on slideshows
- No intro/outro cards
- No text overlays or captions
- ✅ **Good**: Every visual element animates

#### 4. Composition (-5/-3 pts per issue)
**Critical/Important**: Timeline structure
- Overlapping clips (critical)
- Gaps in timeline (important)
- Missing intro/outro (minor)

#### 5. Timing (-5 pts per issue)
**Critical**: Timing errors
- Clips beyond video duration
- Negative start times
- Invalid clip sequences

### Quality Scoring

- **85-100**: Excellent - Professional quality
- **70-84**: Good - Minor improvements needed
- **50-69**: Fair - Significant issues present
- **0-49**: Poor - Major problems need fixing

## Usage

### Enabling Agentic Mode

1. **Open Settings** (gear icon on home page)
2. **Navigate to "Advanced" tab**
3. **Toggle "Agentic Video Creation"** to ON
4. **Configure**:
   - Target Score: 70-100 (default: 85)
   - Max Iterations: 1-10 (default: 5)

### Generation Flow

With agentic mode enabled:

```bash
1. User enters prompt and uploads assets
2. Click "Generate Video"
3. Initial AI generation (30-60s)
4. 🤖 Agentic refinement starts:
   - Iteration 1: Analyze initial video (Score: 65/100)
   - Iteration 2: Fix static images, add Ken Burns (Score: 75/100)
   - Iteration 3: Improve pacing, vary durations (Score: 82/100)
   - Iteration 4: Add intro/outro cards (Score: 88/100)
   - ✅ Complete! Score >= 85
5. Navigate to editor with refined video
```

### Example Progress Messages

```
Generating video spec...
🤖 Starting agentic video refinement...
🤖 Iteration 1/5: Analyzing video... (Score: 0/100)
🤖 Iteration 1/5: Initial analysis complete. Score: 65/100 (Score: 65/100)
🤖 Iteration 2/5: Analyzing and improving video... (Score: 65/100)
🤖 Iteration 2/5: Iteration 2 complete. Score improved to 78/100 (Score: 78/100)
🤖 Iteration 3/5: Analyzing and improving video... (Score: 78/100)
🤖 Iteration 3/5: ✅ Refinement complete! Final score: 87/100 (Score: 87/100)
Video draft generated!
```

## Implementation

### Key Files

- **`src/lib/agent/analysis-tools.ts`** - Quality analysis functions
- **`src/lib/agent/video-agent.ts`** - Agent orchestration and tool calling
- **`src/components/home/settings-dialog.tsx`** - UI for agentic mode config
- **`src/lib/claude/client.ts`** - Integration with video generation

### Analysis Tools API

```typescript
import { analyzeVideoQuality, formatAnalysisReport } from '@/lib/agent/analysis-tools';

// Analyze video
const result = analyzeVideoQuality(spec);

console.log(result.score); // 75
console.log(result.issues); // Array of Issue objects
console.log(result.suggestions); // Array of improvement suggestions

// Format as readable report
const report = formatAnalysisReport(result);
console.log(report);
```

### Agent API

```typescript
import { createAgentSession } from '@/lib/agent/video-agent';

const refinedSpec = await createAgentSession(
  initialSpec,
  assets,
  {
    targetScore: 85,
    maxIterations: 5,
    apiKey: 'sk-...',
    model: 'claude-sonnet-4-5-20241022',
    onProgress: (update) => {
      console.log(`Iteration ${update.iteration}: ${update.message}`);
      console.log(`Score: ${update.score}/100`);
    },
  }
);
```

## Browser Compatibility

✅ **Fully browser-compatible** - No Node.js dependencies
- Uses Anthropic SDK in browser mode
- Tool calling via Claude API
- Async iteration with progress callbacks
- All data stored in IndexedDB

## Limitations

### Current Limitations

1. **Claude-only**: Agentic mode requires Claude API (uses tool calling)
   - Gemini, OpenAI, etc. not yet supported
   - Need to implement tool calling for each provider

2. **Single-turn refinement**: Agent refines entire spec each iteration
   - Not yet doing targeted, incremental changes
   - Future: More surgical edits

3. **No version history**: Can't roll back to previous iteration
   - Future: Store iteration history in IndexedDB
   - Allow user to choose best version

4. **Limited skill export**: Agent can add skills, but export may render placeholders
   - ImageSlideshow fully exports
   - Other skills need full rendering implementation

### Performance Considerations

- **Time**: Each iteration adds 10-30s
  - 5 iterations = 50-150s additional time
  - Default 5 iterations usually sufficient

- **API Costs**: More API calls
  - Initial generation: ~3K tokens
  - Each iteration: ~2-5K tokens
  - 5 iterations ≈ 15-25K tokens total

- **Browser**: All processing in browser
  - No server-side requirements
  - IndexedDB for storage

## Examples

### Before Agentic Mode

User prompt: "Create a 30-second product showcase"

**Generated (Score: 60/100)**:
- 3 static image clips (no motion)
- All clips 10s duration (monotonous)
- No intro or outro
- No text overlays

Issues:
- ❌ 3 static images without Ken Burns
- ❌ Monotonous pacing
- ❌ Missing intro/outro
- ❌ No overlay effects

### After Agentic Mode (Score: 88/100)

**Refined**:
- ImageSlideshow with Ken Burns effects (zoomIn, panRight, zoomOut)
- Varied pacing: 4s, 8s, 6s, 7s, 5s clips
- IntroTitleCard with animated logo (3s)
- OutroCTA with pulsing button (4s)
- LowerThird overlays on key clips
- Crossfade transitions (0.8s)

Improvements:
- ✅ All images have cinematic motion
- ✅ Dynamic pacing rhythm
- ✅ Professional intro/outro
- ✅ Text overlays for key points

## Troubleshooting

### Agent Gets Stuck in Loop

**Symptom**: Iterations don't improve score

**Causes**:
- Invalid asset references (hallucinated IDs)
- Malformed spec updates
- Conflicting requirements

**Solutions**:
- Check console for errors
- Verify assets are properly loaded
- Try lower target score (75 instead of 85)
- Reduce max iterations to 3

### Score Doesn't Reach Target

**Symptom**: Agent stops after max iterations with score < target

**Causes**:
- Complex video needs more iterations
- Conflicting requirements
- Asset limitations (not enough media)

**Solutions**:
- Increase max iterations to 7-10
- Lower target score to 75-80
- Upload more varied assets
- Simplify prompt

### Agentic Mode Disabled

**Symptom**: Toggle grayed out or not available

**Causes**:
- Non-Claude AI provider selected
- API key not configured

**Solutions**:
- Select Claude provider in settings
- Add Claude API key
- Check that API key is valid

## Future Enhancements

### Phase 1: Multi-Provider Support (4-6 hours)
- Implement tool calling for Gemini, OpenAI
- Unified tool interface across providers
- Fallback to Claude if provider doesn't support tools

### Phase 2: Incremental Refinement (6-8 hours)
- Targeted clip-level improvements
- Preserve good parts, only fix issues
- Reduce API token usage

### Phase 3: Version History (3-5 hours)
- Store iteration snapshots in IndexedDB
- UI to browse versions
- Rollback to any previous state

### Phase 4: User Feedback Loop (8-10 hours)
- User rates each iteration
- Agent learns preferences
- Conversational refinement
- "Make it more energetic" → Agent adjusts

### Phase 5: Predictive Analysis (10-15 hours)
- Analyze user's past videos
- Learn style preferences
- Pre-emptively apply user's favorite patterns
- "Smart defaults" based on history

## Best Practices

### Prompt Engineering for Agentic Mode

**Good prompts**:
```
Create a 30-second travel video with dynamic Ken Burns effects
on beach photos. Add a vibrant intro and call-to-action outro.
```

**Better prompts** (for agentic mode):
```
Create a 30-second professional travel video:
- Use all beach photos with cinematic motion
- Vary clip durations for dynamic pacing
- Include branded intro with logo
- Add destination captions on each location
- End with call-to-action to book trip
```

### Settings Recommendations

**For quick previews**: Disable agentic mode
- Fastest generation (30-60s)
- Good for testing prompts
- Can manually refine in chat

**For production videos**: Enable agentic mode
- Target score: 85 (high quality)
- Max iterations: 5 (balanced time/quality)
- Best for final outputs

**For experimentation**: Enable with low settings
- Target score: 75 (faster)
- Max iterations: 3 (quick iterations)
- See what agent does without long wait

## Conclusion

The agentic video creation system brings autonomous AI refinement to DraftCut:

- **Automatic quality improvement** - AI fixes common issues
- **Consistent results** - Videos meet quality standards
- **Saves time** - No manual iteration needed
- **Learns best practices** - Agent applies motion graphics expertise

**Try it today!** Enable agentic mode in Settings → Advanced.

---

**Questions?** Check [CLAUDE.md](./CLAUDE.md) for architecture details or [TESTING-EXPORT.md](./TESTING-EXPORT.md) for testing guides.
