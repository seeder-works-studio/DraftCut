/**
 * Video content analysis using Gemini 2.0 Flash
 * Analyzes video files to understand content, scenes, and editing suggestions
 */

export interface VideoAnalysis {
  videoId: string;
  filename: string;
  duration: number;

  // Overall analysis
  summary: string;
  tone: string; // "energetic", "calm", "professional", etc.
  primarySubjects: string[]; // ["person talking", "beach scene", "product demo"]

  // Scene breakdown
  scenes: VideoScene[];

  // Key moments
  highlights: VideoHighlight[];

  // Editing suggestions
  trimSuggestions: TrimSuggestion[];
  orderSuggestion?: number; // Suggested position in final edit

  // Technical details
  hasAudio: boolean;
  audioDescription?: string;
  visualQuality: 'excellent' | 'good' | 'fair' | 'poor';
  stabilization: 'stable' | 'shaky';
}

export interface VideoScene {
  startTime: number;
  endTime: number;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  tags: string[]; // ["action", "dialogue", "b-roll", "transition"]
  motion: 'static' | 'slow' | 'medium' | 'fast';
  subjects: string[]; // What's visible in this scene
}

export interface VideoHighlight {
  timestamp: number;
  description: string;
  reason: string; // Why this is a highlight
}

export interface TrimSuggestion {
  startTime: number;
  endTime: number;
  reason: string; // "dead air", "redundant", "low importance"
  severity: 'recommended' | 'optional';
}

/**
 * Analyze video content using Gemini 2.0 Flash (native video understanding)
 */
export async function analyzeVideoWithGemini(
  videoFile: File,
  apiKey: string,
  options: {
    detailLevel?: 'basic' | 'detailed';
    purpose?: 'highlights' | 'story' | 'tutorial' | 'general';
  } = {}
): Promise<VideoAnalysis> {
  const { detailLevel = 'detailed', purpose = 'general' } = options;

  // Step 1: Upload video to Gemini Files API
  const uploadedFile = await uploadVideoToGemini(videoFile, apiKey);

  // Step 2: Analyze with Gemini 2.0 Flash
  const prompt = buildAnalysisPrompt(detailLevel, purpose);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                fileData: {
                  mimeType: videoFile.type,
                  fileUri: uploadedFile.uri,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Lower for more consistent analysis
          maxOutputTokens: 8000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini video analysis failed: ${error}`);
  }

  const data = await response.json();
  const analysisJson = data.candidates[0].content.parts[0].text;

  // Parse and validate response
  let analysis: VideoAnalysis;
  try {
    analysis = JSON.parse(analysisJson);
  } catch (err) {
    // If JSON parsing fails, extract from markdown
    const jsonMatch = analysisJson.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error('Failed to parse video analysis response');
    }
  }

  // Enrich with metadata
  analysis.videoId = uploadedFile.name;
  analysis.filename = videoFile.name;

  return analysis;
}

/**
 * Upload video file to Gemini Files API for processing
 */
async function uploadVideoToGemini(
  videoFile: File,
  apiKey: string
): Promise<{ uri: string; name: string }> {
  // Step 1: Initiate resumable upload
  const initResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': videoFile.size.toString(),
        'X-Goog-Upload-Header-Content-Type': videoFile.type,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: videoFile.name,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    throw new Error(`Failed to initiate video upload: ${await initResponse.text()}`);
  }

  const uploadUrl = initResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from Gemini');
  }

  // Step 2: Upload file data
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': videoFile.size.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: videoFile,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Video upload failed: ${await uploadResponse.text()}`);
  }

  const fileData = await uploadResponse.json();

  // Step 3: Wait for video processing to complete
  const processedFile = await waitForVideoProcessing(fileData.file.name, apiKey);

  return processedFile;
}

/**
 * Wait for Gemini to finish processing the uploaded video
 */
async function waitForVideoProcessing(
  fileName: string,
  apiKey: string,
  maxWaitTime = 60000 // 60 seconds
): Promise<{ uri: string; name: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to check video processing status: ${await response.text()}`);
    }

    const fileData = await response.json();

    if (fileData.state === 'ACTIVE') {
      return {
        uri: fileData.uri,
        name: fileData.name,
      };
    }

    if (fileData.state === 'FAILED') {
      throw new Error(`Video processing failed: ${fileData.error?.message || 'Unknown error'}`);
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Video processing timeout - file took too long to process');
}

/**
 * Build analysis prompt based on detail level and purpose
 */
function buildAnalysisPrompt(
  detailLevel: 'basic' | 'detailed',
  purpose: 'highlights' | 'story' | 'tutorial' | 'general'
): string {
  const basePrompt = `Analyze this video and provide a structured JSON response with the following information:

1. **summary**: Brief overview of the video content (2-3 sentences)
2. **tone**: Overall tone/mood (e.g., "energetic", "calm", "professional", "casual")
3. **primarySubjects**: Array of main subjects/topics (e.g., ["person presenting", "product demo", "beach scenery"])
4. **scenes**: Array of scenes with:
   - startTime: Start timestamp in seconds
   - endTime: End timestamp in seconds
   - description: What happens in this scene
   - importance: "critical", "high", "medium", or "low"
   - tags: Array of tags (e.g., ["action", "dialogue", "b-roll", "transition"])
   - motion: "static", "slow", "medium", or "fast"
   - subjects: Array of what's visible
5. **highlights**: Array of key moments with:
   - timestamp: When it occurs
   - description: What makes it noteworthy
   - reason: Why it's a highlight
6. **trimSuggestions**: Array of parts to potentially remove:
   - startTime: Where to start cutting
   - endTime: Where to stop cutting
   - reason: Why (e.g., "dead air", "redundant content", "low importance")
   - severity: "recommended" or "optional"
7. **hasAudio**: Boolean - does video have audio?
8. **audioDescription**: If audio present, describe it (speech, music, effects)
9. **visualQuality**: "excellent", "good", "fair", or "poor"
10. **stabilization**: "stable" or "shaky"

`;

  const purposeGuidance: Record<typeof purpose, string> = {
    highlights: `
Focus on identifying the BEST moments - most exciting, most engaging, most visually impressive.
Mark scenes with high action/energy as "critical" importance.
Suggest aggressive trimming of slower moments.`,

    story: `
Focus on narrative flow and story structure.
Identify setup, conflict, resolution elements.
Suggest ordering scenes for compelling storytelling.
Mark key story beats as "critical" importance.`,

    tutorial: `
Focus on instructional content and step-by-step flow.
Identify distinct steps or segments.
Mark clear explanations as "critical" importance.
Flag redundant explanations for trimming.`,

    general: `
Provide balanced analysis for general video editing.
Identify both exciting and calm moments.
Give moderate trimming suggestions.`,
  };

  const detailGuidance =
    detailLevel === 'detailed'
      ? `\nProvide DETAILED scene breakdowns - split the video into many small scenes (5-15 seconds each) for precise editing control.`
      : `\nProvide BASIC scene breakdowns - focus on major sections/segments only.`;

  return basePrompt + purposeGuidance[purpose] + detailGuidance + '\n\nReturn ONLY valid JSON, no other text.';
}

/**
 * Analyze multiple videos and suggest optimal ordering
 */
export async function analyzeMultipleVideos(
  videos: File[],
  apiKey: string,
  purpose: 'highlights' | 'story' | 'tutorial' | 'general' = 'general',
  onProgress?: (current: number, total: number, videoName: string) => void
): Promise<VideoAnalysis[]> {
  const analyses: VideoAnalysis[] = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    onProgress?.(i + 1, videos.length, video.name);

    const analysis = await analyzeVideoWithGemini(video, apiKey, {
      detailLevel: 'detailed',
      purpose,
    });

    analyses.push(analysis);
  }

  // Add suggested ordering based on content
  if (purpose === 'story') {
    suggestStoryOrder(analyses);
  } else if (purpose === 'highlights') {
    suggestHighlightOrder(analyses);
  }

  return analyses;
}

/**
 * Suggest optimal story order based on narrative flow
 */
function suggestStoryOrder(analyses: VideoAnalysis[]): void {
  // Score each video for story position
  const scored = analyses.map((analysis, index) => {
    let score = 0;

    // Setup/intro indicators
    if (
      analysis.summary.toLowerCase().includes('intro') ||
      analysis.scenes[0]?.tags.includes('setup')
    ) {
      score += 100;
    }

    // Conclusion indicators
    if (
      analysis.summary.toLowerCase().includes('conclusion') ||
      analysis.summary.toLowerCase().includes('outro')
    ) {
      score -= 100;
    }

    // Action/climax indicators
    const actionScenes = analysis.scenes.filter((s) =>
      s.tags.includes('action') || s.motion === 'fast'
    );
    if (actionScenes.length > analysis.scenes.length / 2) {
      score += 50; // Put action in middle
    }

    return { analysis, originalIndex: index, score };
  });

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Assign order suggestions
  scored.forEach((item, newIndex) => {
    item.analysis.orderSuggestion = newIndex;
  });
}

/**
 * Suggest highlight order (best first)
 */
function suggestHighlightOrder(analyses: VideoAnalysis[]): void {
  // Score by number of highlights and critical scenes
  const scored = analyses.map((analysis, index) => {
    const criticalScenes = analysis.scenes.filter((s) => s.importance === 'critical').length;
    const highlightCount = analysis.highlights.length;

    return {
      analysis,
      score: criticalScenes * 3 + highlightCount * 2,
    };
  });

  // Sort by score (descending - best first)
  scored.sort((a, b) => b.score - a.score);

  // Assign order
  scored.forEach((item, index) => {
    item.analysis.orderSuggestion = index;
  });
}

/**
 * Check if Gemini API key is valid and has video capabilities
 */
export async function checkGeminiVideoSupport(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${apiKey}`
    );

    if (!response.ok) return false;

    const model = await response.json();
    return model.supportedGenerationMethods?.includes('generateContent') || false;
  } catch {
    return false;
  }
}
