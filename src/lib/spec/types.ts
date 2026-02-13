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
