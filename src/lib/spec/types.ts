export interface ProjectSpec {
  version: string;

  metadata: {
    created: string;
    modified: string;
    projectId?: string;
    description?: string;
  };

  canvas: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    backgroundColor: string;
  };

  assets: Asset[];

  composition: {
    tracks: Track[];
  };

  brandKit?: BrandKit;
}

export interface Asset {
  id: string;
  type: 'video' | 'audio' | 'image';
  filename: string;
  duration?: number;
  width?: number;
  height?: number;
  storageKey?: string;
  colors?: string[]; // Dominant colors extracted from image (hex format)

  // Video analysis (auto-generated for video assets)
  videoAnalysis?: VideoAnalysisSummary;
}

export interface VideoAnalysisSummary {
  analyzed: boolean;
  analyzedAt: string;

  // Quick summary for AI prompts
  totalScenes: number;
  bestMomentsCount: number;
  suggestedClipsCount: number;
  overallTone: string;
  topSubjects: string[];

  // Detailed clip suggestions
  suggestedClips: Array<{
    startTime: number;
    endTime: number;
    reason: string;
    interestScore: number;
  }>;

  // Best moments for highlights
  bestMoments: Array<{
    timestamp: number;
    reason: string;
  }>;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips: Clip[];
}

export interface Clip {
  id: string;
  type: 'video' | 'audio' | 'image' | 'skill';

  startTime: number;
  duration: number;

  assetId?: string;
  trimStart?: number;
  trimEnd?: number;

  skillType?: SkillType;
  skillProps?: Record<string, unknown>;

  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    opacity?: number;
  };

  transition?: {
    type: 'dissolve' | 'slide' | 'fade';
    duration: number;
  };
}

export type SkillType =
  | 'LowerThird'
  | 'CaptionsPop'
  | 'CalloutBoxArrow'
  | 'IntroTitleCard'
  | 'OutroCTA'
  | 'ImageSlideshow'
  | 'TextReveal'
  | 'TerminalWindow'
  | 'KineticTypography'
  | 'BrandLogo'
  | 'CountUpNumber'
  | 'ProgressBar';

export interface BrandKit {
  logoAssetId?: string;
  primaryFont?: string;
  primaryColor?: string;
  secondaryColor?: string;
}
