/**
 * Smart Video Analysis: Scene detection + frame sampling + Gemini Vision
 * Analyzes long videos by extracting key frames and using image analysis
 * Much faster and cheaper than full video analysis
 */

export interface SceneFrame {
  timestamp: number;
  frameDataUrl: string; // base64 image
  sceneIndex: number;
}

export interface FrameAnalysis {
  timestamp: number;
  description: string;
  interestScore: number; // 0-10, how interesting this scene is
  subjects: string[]; // What's in the frame
  motion: 'static' | 'slow' | 'medium' | 'fast';
  visualQuality: 'excellent' | 'good' | 'fair' | 'poor';
  tags: string[]; // ["action", "people", "landscape", etc.]
  recommended: boolean; // Should this scene be included?
  isTalkingHead: boolean; // Is this a person speaking to camera?
  speakerEngagement: number; // 0-10, how engaged/animated the speaker appears
}

export interface SmartVideoAnalysis {
  videoFilename: string;
  duration: number;
  totalScenes: number;
  analyzedFrames: number;

  // Frame-by-frame analysis
  frames: FrameAnalysis[];

  // Aggregated insights
  bestMoments: Array<{ timestamp: number; reason: string }>;
  suggestedClips: Array<{ startTime: number; endTime: number; reason: string }>;
  overallTone: string;
  summary: string;
}

/**
 * Analyze long video using smart frame sampling
 */
export async function analyzeVideoWithFrameSampling(
  videoFile: File,
  geminiApiKey: string,
  options: {
    maxFrames?: number; // Absolute max frames to analyze (default: 10)
    minSceneLength?: number; // Minimum seconds between scenes (default: 10)
    purpose?: 'highlights' | 'story' | 'general';
  } = {}
): Promise<SmartVideoAnalysis> {
  const {
    maxFrames = 10, // ALWAYS limit to 10 frames max
    minSceneLength = 10, // Stricter: 10 seconds minimum between scenes
    purpose = 'highlights',
  } = options;

  // Step 1: Load video in browser
  const videoElement = await loadVideoElement(videoFile);
  const duration = videoElement.duration;

  // Step 2: Detect scene changes (local, fast) with stricter threshold
  console.log('Detecting scene changes...');
  const sceneChanges = await detectSceneChanges(videoElement, minSceneLength);
  console.log(`Found ${sceneChanges.length} scene changes`);

  // Step 3: Sample frames - HARD LIMIT of maxFrames (default 10)
  const sampledScenes = sampleScenes(sceneChanges, maxFrames);
  console.log(`Sampling ${sampledScenes.length} frames for analysis (max: ${maxFrames})`);

  // Step 4: Extract frames as images
  const frames = await extractFrames(videoElement, sampledScenes);

  // Step 5: Analyze all frames with Gemini Vision (batch)
  console.log('Analyzing frames with Gemini Vision...');
  const frameAnalyses = await analyzeFramesWithGemini(
    frames,
    geminiApiKey,
    purpose
  );

  // Step 6: Aggregate results and generate suggestions
  const analysis = aggregateAnalysis(
    videoFile.name,
    duration,
    sceneChanges.length,
    frameAnalyses
  );

  return analysis;
}

/**
 * Load video file into HTMLVideoElement
 */
async function loadVideoElement(videoFile: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve(video);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Detect scene changes using frame difference
 */
async function detectSceneChanges(
  video: HTMLVideoElement,
  minSceneLength: number
): Promise<number[]> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  canvas.width = 160; // Low res for speed
  canvas.height = 90;

  const sceneChanges: number[] = [0]; // Always include start
  let lastFrame: ImageData | null = null;
  const threshold = 45; // STRICTER: Higher threshold = fewer scene changes (0-100)

  // Sample every 1 second (faster detection, still catches major scene changes)
  const sampleInterval = 1.0;
  const duration = video.duration;

  for (let t = 0; t < duration; t += sampleInterval) {
    video.currentTime = t;
    await waitForSeek(video);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (lastFrame) {
      const difference = calculateFrameDifference(lastFrame, currentFrame);

      // Detect scene change
      if (difference > threshold) {
        const lastScene = sceneChanges[sceneChanges.length - 1];

        // Only add if enough time has passed since last scene
        if (t - lastScene >= minSceneLength) {
          sceneChanges.push(t);
        }
      }
    }

    lastFrame = currentFrame;
  }

  return sceneChanges;
}

/**
 * Calculate difference between two frames (0-100)
 */
function calculateFrameDifference(frame1: ImageData, frame2: ImageData): number {
  const data1 = frame1.data;
  const data2 = frame2.data;

  let totalDiff = 0;
  const pixels = data1.length / 4;

  for (let i = 0; i < data1.length; i += 4) {
    // Compare RGB values (skip alpha)
    const diff = Math.abs(data1[i] - data2[i]) +
                 Math.abs(data1[i + 1] - data2[i + 1]) +
                 Math.abs(data1[i + 2] - data2[i + 2]);

    totalDiff += diff;
  }

  // Normalize to 0-100
  return (totalDiff / (pixels * 3 * 255)) * 100;
}

/**
 * Wait for video to seek to a specific time
 */
function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);

    // Timeout fallback
    setTimeout(resolve, 100);
  });
}

/**
 * Sample scenes to respect max frames limit
 */
function sampleScenes(sceneChanges: number[], maxFrames: number): number[] {
  if (sceneChanges.length <= maxFrames) {
    return sceneChanges;
  }

  // Evenly distribute samples
  const step = sceneChanges.length / maxFrames;
  const sampled: number[] = [];

  for (let i = 0; i < maxFrames; i++) {
    const index = Math.floor(i * step);
    sampled.push(sceneChanges[index]);
  }

  return sampled;
}

/**
 * Extract frames at given timestamps
 */
async function extractFrames(
  video: HTMLVideoElement,
  timestamps: number[]
): Promise<SceneFrame[]> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Use reasonable resolution (not full quality to save on analysis cost)
  canvas.width = 1280;
  canvas.height = 720;

  const frames: SceneFrame[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];

    video.currentTime = timestamp;
    await waitForSeek(video);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    frames.push({
      timestamp,
      frameDataUrl,
      sceneIndex: i,
    });
  }

  return frames;
}

/**
 * Analyze frames using Gemini Vision API (batch processing)
 */
async function analyzeFramesWithGemini(
  frames: SceneFrame[],
  apiKey: string,
  purpose: 'highlights' | 'story' | 'general'
): Promise<FrameAnalysis[]> {
  const prompt = buildFrameAnalysisPrompt(purpose, frames.length);

  // Build multi-image request
  const imageParts = frames.map((frame) => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: frame.frameDataUrl.split(',')[1], // Remove data:image/jpeg;base64, prefix
    },
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini analysis failed: ${await response.text()}`);
  }

  const data = await response.json();
  const analysisJson = data.candidates[0].content.parts[0].text;

  // Parse response
  const analyses = JSON.parse(analysisJson) as FrameAnalysis[];

  // Attach timestamps from original frames
  return analyses.map((analysis, i) => ({
    ...analysis,
    timestamp: frames[i].timestamp,
  }));
}

/**
 * Build prompt for frame analysis
 */
function buildFrameAnalysisPrompt(
  purpose: 'highlights' | 'story' | 'general',
  frameCount: number
): string {
  const purposeInstruction = {
    highlights: 'Focus on visual excitement, action, and engagement. Rate scenes higher if they have movement, interesting subjects, or dynamic composition.',
    story: 'Focus on narrative elements and story flow. Look for setups, conflicts, resolutions, and emotional moments.',
    general: 'Provide balanced analysis suitable for general video editing.',
  }[purpose];

  return `You are analyzing ${frameCount} frames from a video. Each frame represents a scene change or key moment.

IMPORTANT: This video likely contains TALKING HEAD FOOTAGE (people speaking to camera). Pay special attention to these moments.

For EACH frame (in order), provide analysis in JSON format:

{
  "description": "Brief description of what's happening (1 sentence)",
  "interestScore": <number 0-10, how interesting/engaging this scene is>,
  "subjects": ["array", "of", "main subjects/objects"],
  "motion": "static|slow|medium|fast (estimate based on visual blur/composition)",
  "visualQuality": "excellent|good|fair|poor",
  "tags": ["array", "of", "descriptive tags like action, people, landscape, product, text, etc."],
  "recommended": <true if this scene should be included in final edit, false otherwise>,
  "isTalkingHead": <true if this shows a person facing the camera (likely speaking), false otherwise>,
  "speakerEngagement": <number 0-10, if talking head: how engaged/animated does the speaker appear? 0 if not a talking head>
}

${purposeInstruction}

Return a JSON array with ${frameCount} objects (one per frame), in order.

TALKING HEAD DETECTION:
- isTalkingHead = true if you see a person's face clearly, facing the camera (typical of presentations, vlogs, interviews)
- Look for: direct eye contact with camera, person centered in frame, speaking gesture/posture
- speakerEngagement: Rate their energy (10 = very animated/excited, 5 = neutral, 0 = not a talking head)

INTEREST SCORING:
- Talking heads with high engagement (8-10) should get interestScore 8-10
- Boring static shots or transitions should get 0-3
- Visual interest, composition quality, and subject clarity all matter
- ${purpose === 'highlights' ? 'Prioritize dynamic, engaging moments with clear subjects' : ''}

Be honest - mark boring or low-quality frames as NOT recommended.`;
}

/**
 * Aggregate frame analyses into overall video analysis
 */
function aggregateAnalysis(
  filename: string,
  duration: number,
  totalScenes: number,
  frameAnalyses: FrameAnalysis[]
): SmartVideoAnalysis {
  // Find best moments (prioritize talking heads with high engagement)
  const bestMoments = frameAnalyses
    .filter((f) => {
      // Talking heads with good engagement always qualify
      if (f.isTalkingHead && f.speakerEngagement >= 6) return true;
      // Other interesting moments need high score
      return f.interestScore >= 7;
    })
    .sort((a, b) => {
      // Prioritize talking heads with high engagement
      if (a.isTalkingHead && !b.isTalkingHead) return -1;
      if (!a.isTalkingHead && b.isTalkingHead) return 1;
      // Then sort by engagement/interest
      const aScore = a.isTalkingHead ? a.speakerEngagement : a.interestScore;
      const bScore = b.isTalkingHead ? b.speakerEngagement : b.interestScore;
      return bScore - aScore;
    })
    .map((f) => ({
      timestamp: f.timestamp,
      reason: f.isTalkingHead
        ? `Talking head (engagement: ${f.speakerEngagement}/10): ${f.description}`
        : f.description,
    }));

  // Generate clip suggestions (extract few seconds around each good timestamp)
  const suggestedClips: Array<{
    startTime: number;
    endTime: number;
    reason: string;
    isTalkingHead?: boolean;
    speakerEngagement?: number;
  }> = [];
  const clipPadding = 3; // Extract 3 seconds before and after timestamp

  for (let i = 0; i < frameAnalyses.length; i++) {
    const frame = frameAnalyses[i];

    // Include talking heads with decent engagement OR other high-interest moments
    const shouldInclude =
      (frame.isTalkingHead && frame.speakerEngagement >= 6) ||
      (frame.recommended && frame.interestScore >= 6);

    if (shouldInclude) {
      // Extract a clip around this timestamp (few seconds before + after)
      const startTime = Math.max(0, frame.timestamp - clipPadding);
      const endTime = Math.min(duration, frame.timestamp + clipPadding);

      suggestedClips.push({
        startTime,
        endTime,
        reason: frame.isTalkingHead
          ? `Talking head (${frame.speakerEngagement}/10 engagement): ${frame.description}`
          : frame.description,
        isTalkingHead: frame.isTalkingHead,
        speakerEngagement: frame.speakerEngagement,
      });
    }
  }

  // Determine overall tone
  const avgInterestScore =
    frameAnalyses.reduce((sum, f) => sum + f.interestScore, 0) / frameAnalyses.length;

  const overallTone =
    avgInterestScore >= 7
      ? 'energetic and engaging'
      : avgInterestScore >= 5
      ? 'balanced'
      : 'calm and slow-paced';

  // Generate summary
  const topSubjects = getMostCommonSubjects(frameAnalyses);
  const summary = `Video features ${topSubjects.join(', ')}. ${bestMoments.length} highly engaging moments identified. Overall tone: ${overallTone}.`;

  return {
    videoFilename: filename,
    duration,
    totalScenes,
    analyzedFrames: frameAnalyses.length,
    frames: frameAnalyses,
    bestMoments,
    suggestedClips,
    overallTone,
    summary,
  };
}

/**
 * Get most common subjects across all frames
 */
function getMostCommonSubjects(frames: FrameAnalysis[]): string[] {
  const subjectCounts = new Map<string, number>();

  for (const frame of frames) {
    for (const subject of frame.subjects) {
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);
    }
  }

  return Array.from(subjectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
}

/**
 * Analyze multiple videos and suggest best clips across all
 */
export async function analyzeMultipleVideosWithFrameSampling(
  videos: File[],
  geminiApiKey: string,
  purpose: 'highlights' | 'story' | 'general' = 'highlights',
  onProgress?: (current: number, total: number, videoName: string) => void
): Promise<SmartVideoAnalysis[]> {
  const analyses: SmartVideoAnalysis[] = [];

  for (let i = 0; i < videos.length; i++) {
    onProgress?.(i + 1, videos.length, videos[i].name);

    const analysis = await analyzeVideoWithFrameSampling(videos[i], geminiApiKey, {
      maxFrames: 10,
      minSceneLength: 10,
      purpose,
    });

    analyses.push(analysis);
  }

  return analyses;
}
