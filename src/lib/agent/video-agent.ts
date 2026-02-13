/**
 * Agentic video creation system
 * Iteratively refines videos using AI with tool calling
 */

import type { ProjectSpec, Asset } from '@/lib/spec/types';
import { analyzeVideoQuality, formatAnalysisReport } from './analysis-tools';
import type { AnalysisResult } from './analysis-tools';
import { anthropic } from '@/lib/claude/client';
import type Anthropic from '@anthropic-ai/sdk';
import { analyzeVideoWithGemini, analyzeMultipleVideos } from '@/lib/ai/video-analysis';
import type { VideoAnalysis } from '@/lib/ai/video-analysis';
import { loadAPIKey } from '@/lib/storage/api-keys';

export interface AgentSession {
  id: string;
  phase: 'initial' | 'analysis' | 'refinement' | 'complete';
  iterations: AgentIteration[];
  currentSpec: ProjectSpec | null;
  targetScore: number; // 0-100, stop when reached
  maxIterations: number;
  onProgress?: (update: AgentProgress) => void;
}

export interface AgentIteration {
  number: number;
  phase: string;
  spec: ProjectSpec;
  analysis: AnalysisResult;
  aiResponse: string;
  toolCalls: ToolCall[];
  timestamp: Date;
}

export interface ToolCall {
  name: string;
  input: any;
  output: any;
}

export interface AgentProgress {
  iteration: number;
  phase: string;
  score: number;
  message: string;
  spec?: ProjectSpec;
}

export interface AgentConfig {
  targetScore?: number; // Default: 85
  maxIterations?: number; // Default: 5
  apiKey: string;
  model?: string; // Default: claude-sonnet-4-5
  onProgress?: (update: AgentProgress) => void;
}

/**
 * Tool definitions for AI agent
 */
const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'analyze_video',
    description:
      'Analyze the current video specification for quality issues. Returns a detailed report with issues, score, and suggestions.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analyze_video_content',
    description:
      'Analyze actual video file content using AI vision to understand what\'s in the video, detect scenes, identify highlights, and suggest trim points. Use this to understand raw video footage before editing.',
    input_schema: {
      type: 'object',
      properties: {
        videoAssetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of video asset IDs to analyze',
        },
        purpose: {
          type: 'string',
          enum: ['highlights', 'story', 'tutorial', 'general'],
          description: 'Analysis purpose - affects what the AI focuses on',
        },
      },
      required: ['videoAssetIds'],
    },
  },
  {
    name: 'suggest_video_order',
    description:
      'Suggest optimal ordering for multiple videos based on their content analysis. Returns suggested order and rationale.',
    input_schema: {
      type: 'object',
      properties: {
        analyses: {
          type: 'array',
          description: 'Array of video analyses from analyze_video_content',
        },
        goal: {
          type: 'string',
          enum: ['story', 'highlights', 'tutorial', 'chronological'],
          description: 'Editing goal that determines order logic',
        },
      },
      required: ['analyses', 'goal'],
    },
  },
  {
    name: 'get_video_stats',
    description:
      'Get statistics about the current video (duration, clip count, track count, skill usage)',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_video_spec',
    description:
      'Update the video specification with improvements. Provide the complete updated ProjectSpec as JSON.',
    input_schema: {
      type: 'object',
      properties: {
        spec: {
          type: 'object',
          description: 'Complete updated ProjectSpec JSON',
        },
        changes: {
          type: 'string',
          description: 'Summary of changes made',
        },
      },
      required: ['spec', 'changes'],
    },
  },
  {
    name: 'complete_refinement',
    description:
      'Mark the refinement process as complete when the video quality is satisfactory.',
    input_schema: {
      type: 'object',
      properties: {
        finalScore: {
          type: 'number',
          description: 'Final quality score (0-100)',
        },
        summary: {
          type: 'string',
          description: 'Summary of improvements made',
        },
      },
      required: ['finalScore', 'summary'],
    },
  },
];

/**
 * Create agentic video refinement session
 */
export async function createAgentSession(
  initialSpec: ProjectSpec,
  assets: Asset[],
  config: AgentConfig
): Promise<ProjectSpec> {
  const session: AgentSession = {
    id: `session-${Date.now()}`,
    phase: 'initial',
    iterations: [],
    currentSpec: initialSpec,
    targetScore: config.targetScore || 85,
    maxIterations: config.maxIterations || 5,
    onProgress: config.onProgress,
  };

  // Initial analysis
  session.onProgress?.({
    iteration: 0,
    phase: 'initial',
    score: 0,
    message: 'Starting agentic video refinement...',
  });

  const initialAnalysis = analyzeVideoQuality(initialSpec);

  session.onProgress?.({
    iteration: 0,
    phase: 'analysis',
    score: initialAnalysis.score,
    message: `Initial analysis complete. Score: ${initialAnalysis.score}/100`,
  });

  // If already good enough, return as-is
  if (initialAnalysis.score >= session.targetScore) {
    session.onProgress?.({
      iteration: 0,
      phase: 'complete',
      score: initialAnalysis.score,
      message: '✨ Video quality already meets target score!',
      spec: initialSpec,
    });
    return initialSpec;
  }

  // Start refinement loop
  session.phase = 'refinement';

  for (let i = 0; i < session.maxIterations; i++) {
    const iteration = i + 1;

    session.onProgress?.({
      iteration,
      phase: 'refining',
      score: initialAnalysis.score,
      message: `Iteration ${iteration}: Analyzing and improving video...`,
    });

    const result = await runAgentIteration(
      session,
      assets,
      config.apiKey,
      config.model
    );

    // Check if complete
    if (result.complete || result.analysis.score >= session.targetScore) {
      session.phase = 'complete';
      session.onProgress?.({
        iteration,
        phase: 'complete',
        score: result.analysis.score,
        message: `✅ Refinement complete! Final score: ${result.analysis.score}/100`,
        spec: result.spec,
      });
      return result.spec;
    }

    // Update for next iteration
    session.currentSpec = result.spec;

    session.onProgress?.({
      iteration,
      phase: 'refining',
      score: result.analysis.score,
      message: `Iteration ${iteration} complete. Score improved to ${result.analysis.score}/100`,
    });
  }

  // Max iterations reached
  session.phase = 'complete';
  const finalAnalysis = analyzeVideoQuality(session.currentSpec!);

  session.onProgress?.({
    iteration: session.maxIterations,
    phase: 'complete',
    score: finalAnalysis.score,
    message: `⚠️ Max iterations reached. Final score: ${finalAnalysis.score}/100`,
    spec: session.currentSpec!,
  });

  return session.currentSpec!;
}

/**
 * Run a single agent iteration
 */
async function runAgentIteration(
  session: AgentSession,
  assets: Asset[],
  apiKey: string,
  model?: string
): Promise<{ spec: ProjectSpec; analysis: AnalysisResult; complete: boolean }> {
  const currentSpec = session.currentSpec!;
  const currentAnalysis = analyzeVideoQuality(currentSpec);

  // Build context for AI
  const systemPrompt = buildAgentSystemPrompt();
  const userPrompt = buildAgentUserPrompt(currentSpec, currentAnalysis, assets);

  // Call Claude with tools
  const client = anthropic(apiKey);

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  let updatedSpec = currentSpec;
  let complete = false;
  const toolCalls: ToolCall[] = [];

  // Agent loop (up to 10 turns)
  for (let turn = 0; turn < 10; turn++) {
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-5-20241022',
      max_tokens: 8000,
      system: systemPrompt,
      messages,
      tools: AGENT_TOOLS,
    });

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.MessageParam['content'] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeToolCall(
            block.name,
            block.input,
            currentSpec,
            updatedSpec
          );

          toolCalls.push({
            name: block.name,
            input: block.input,
            output: result,
          });

          // Update spec if tool returns one
          if (block.name === 'update_video_spec' && result.spec) {
            updatedSpec = result.spec;
          }

          // Check if agent wants to complete
          if (block.name === 'complete_refinement') {
            complete = true;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Add assistant response and tool results to messages
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      // If complete, break
      if (complete) break;
    } else {
      // No more tools to call
      break;
    }
  }

  // Store iteration
  const finalAnalysis = analyzeVideoQuality(updatedSpec);

  session.iterations.push({
    number: session.iterations.length + 1,
    phase: session.phase,
    spec: updatedSpec,
    analysis: finalAnalysis,
    aiResponse: '', // Could store full response if needed
    toolCalls,
    timestamp: new Date(),
  });

  return {
    spec: updatedSpec,
    analysis: finalAnalysis,
    complete,
  };
}

/**
 * Execute tool call and return result
 */
async function executeToolCall(
  toolName: string,
  input: any,
  originalSpec: ProjectSpec,
  currentSpec: ProjectSpec
): Promise<any> {
  switch (toolName) {
    case 'analyze_video': {
      const analysis = analyzeVideoQuality(currentSpec);
      const report = formatAnalysisReport(analysis);
      return { analysis, report };
    }

    case 'analyze_video_content': {
      const { videoAssetIds, purpose = 'general' } = input;

      // Get Gemini API key for video analysis
      const geminiKey = await loadAPIKey('gemini-video');
      if (!geminiKey) {
        return {
          error: 'Gemini Video Analysis API key not configured. Add it in Settings → Media Services.',
        };
      }

      // Get video assets from spec
      const videoAssets = currentSpec.assets.filter(
        (asset) => asset.type === 'video' && videoAssetIds.includes(asset.id)
      );

      if (videoAssets.length === 0) {
        return { error: 'No video assets found with provided IDs' };
      }

      // Analyze videos (in browser, need to fetch blobs from IndexedDB)
      // For now, return placeholder - full implementation needs blob fetching
      return {
        message: 'Video content analysis started',
        note: 'Full implementation requires fetching video blobs from IndexedDB',
        videoCount: videoAssets.length,
        suggestion: 'Use this tool during initial generation to understand video content',
      };
    }

    case 'suggest_video_order': {
      const { analyses, goal } = input;

      // Simple ordering logic based on goal
      const suggestions: string[] = [];

      if (goal === 'story') {
        suggestions.push('Place setup/intro videos first');
        suggestions.push('Put action/climax in the middle');
        suggestions.push('End with conclusion/outro');
      } else if (goal === 'highlights') {
        suggestions.push('Start with most exciting moments');
        suggestions.push('Maintain high energy throughout');
        suggestions.push('End with strong conclusion');
      } else if (goal === 'tutorial') {
        suggestions.push('Order logically step-by-step');
        suggestions.push('Start with overview/introduction');
        suggestions.push('Progress from simple to complex');
      }

      return {
        goal,
        suggestions,
        note: 'Apply these suggestions when reordering video clips in the spec',
      };
    }

    case 'get_video_stats': {
      const clips = currentSpec.composition.tracks.flatMap((t) => t.clips);
      const skillClips = clips.filter((c) => c.type === 'skill');
      const videoClips = clips.filter((c) => c.type === 'video');
      const imageClips = clips.filter((c) => c.type === 'image');
      const audioClips = clips.filter((c) => c.type === 'audio');

      return {
        duration: currentSpec.canvas.duration,
        fps: currentSpec.canvas.fps,
        resolution: `${currentSpec.canvas.width}x${currentSpec.canvas.height}`,
        trackCount: currentSpec.composition.tracks.length,
        clipCount: clips.length,
        skillCount: skillClips.length,
        videoClipCount: videoClips.length,
        imageClipCount: imageClips.length,
        audioClipCount: audioClips.length,
        assetCount: currentSpec.assets.length,
        skills: skillClips.map((c) => c.skillType),
      };
    }

    case 'update_video_spec': {
      const { spec, changes } = input;
      // Validate spec has required structure
      if (!spec.canvas || !spec.composition || !spec.assets) {
        return {
          error: 'Invalid spec structure - must include canvas, composition, and assets',
        };
      }
      return { spec, changes, success: true };
    }

    case 'complete_refinement': {
      return { complete: true, ...input };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Build system prompt for agent
 */
function buildAgentSystemPrompt(): string {
  return `You are an expert video editor AI agent. Your job is to analyze and iteratively improve video specifications to create high-quality, dynamic videos with professional motion graphics.

## Your Process

1. **Analyze**: Use analyze_video tool to check current video quality
2. **Identify Issues**: Look for:
   - Static image clips (should use ImageSlideshow with Ken Burns effects)
   - Poor pacing (clips too long/short, monotonous rhythm)
   - Missing motion graphics (no animations, transitions, effects)
   - Composition problems (overlapping clips, gaps, missing intro/outro)
   - Timing errors (clips beyond duration, negative start times)

3. **Improve**: Use update_video_spec tool to fix issues:
   - Convert static images to ImageSlideshow with Ken Burns effects
   - Vary clip durations for dynamic pacing
   - Add IntroTitleCard and OutroCTA skills
   - Add text overlays (LowerThird, CaptionsPop, TextReveal)
   - Fix timing and composition issues

4. **Complete**: Use complete_refinement when score >= 85/100

## Key Requirements

- **Never use static image clips** - Always use ImageSlideshow skill
- **All slides must have Ken Burns effects**: zoomIn, zoomOut, panLeft, panRight
- **Add crossfade transitions** between slides (0.5-1.0s duration)
- **Vary pacing**: Mix 3-5s clips with 6-10s clips
- **Professional structure**: Intro → Content → Outro
- **Dynamic motion**: Every visual element should animate

## Tools Available

- analyze_video: Get quality report with issues and suggestions
- analyze_video_content: Use AI vision to understand what's IN video files (scenes, highlights, trim suggestions)
- suggest_video_order: Get intelligent ordering suggestions for multiple videos based on content
- get_video_stats: Get video statistics
- update_video_spec: Apply improvements (provide complete ProjectSpec JSON)
- complete_refinement: Mark as complete when quality is good

## Video Content Understanding

When working with actual video files (not images):
1. Use analyze_video_content to understand what's in each video
2. Use suggest_video_order to intelligently order multiple videos
3. Apply trim suggestions from analysis to remove boring parts
4. Reorder videos based on narrative flow or highlights

Work iteratively to achieve high video quality (85+/100 score).`;
}

/**
 * Build user prompt with current state
 */
function buildAgentUserPrompt(
  spec: ProjectSpec,
  analysis: AnalysisResult,
  assets: Asset[]
): string {
  const assetList = assets
    .map((a) => `- ${a.id}: ${a.filename} (${a.type})`)
    .join('\n');

  return `# Current Video Specification

## Video Info
- Duration: ${spec.canvas.duration}s @ ${spec.canvas.fps}fps
- Resolution: ${spec.canvas.width}x${spec.canvas.height}
- Tracks: ${spec.composition.tracks.length}
- Total Clips: ${spec.composition.tracks.reduce((sum, t) => sum + t.clips.length, 0)}

## Available Assets
${assetList}

## Current Quality Score: ${analysis.score}/100

${formatAnalysisReport(analysis)}

## Your Task

Analyze this video and improve it to reach a quality score of 85+/100. Use the tools to:
1. Analyze current state
2. Identify specific improvements needed
3. Update the specification to fix issues
4. Continue until quality target is met

Current spec JSON:
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

Start by analyzing the video to understand what needs improvement.`;
}
