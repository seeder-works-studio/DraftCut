import { z } from 'zod';
import type { SkillType } from '@/lib/spec/types';
import { LowerThird, type LowerThirdProps } from './LowerThird';
import { CaptionsPop, type CaptionsPopProps } from './CaptionsPop';
import { CalloutBoxArrow, type CalloutBoxArrowProps } from './CalloutBoxArrow';
import { IntroTitleCard, type IntroTitleCardProps } from './IntroTitleCard';
import { OutroCTA, type OutroCTAProps } from './OutroCTA';
import { ImageSlideshow, type ImageSlideshowProps } from './ImageSlideshow';
import { TextReveal, type TextRevealProps } from './TextReveal';
import { TerminalWindow, type TerminalWindowProps } from './TerminalWindow';
import { KineticTypography, type KineticTypographyProps } from './KineticTypography';
import { BrandLogo, type BrandLogoProps } from './BrandLogo';
import { CountUpNumber, type CountUpNumberProps } from './CountUpNumber';
import { ProgressBar, type ProgressBarProps } from './ProgressBar';

export interface SkillDefinition {
  id: SkillType;
  name: string;
  component: React.FC<any>;
  defaultDuration: number;
  defaultProps: Record<string, unknown>;
  propsSchema: z.ZodObject<any>;
}

const LowerThirdPropsSchema = z.object({
  name: z.string().default('Name'),
  title: z.string().default('Title'),
  position: z
    .enum(['bottom-left', 'bottom-center', 'bottom-right'])
    .default('bottom-left'),
  backgroundColor: z.string().default('#1a1a1a'),
  textColor: z.string().default('#ffffff'),
});

const CaptionPropsSchema = z.object({
  captions: z
    .array(
      z.object({
        text: z.string(),
        startTime: z.number(),
        duration: z.number(),
        emphasizedWords: z.array(z.number()).optional(),
      })
    )
    .default([{ text: 'Hello World', startTime: 0, duration: 3 }]),
  fontSize: z.number().default(64),
  fontFamily: z.string().default('sans-serif'),
  color: z.string().default('#ffffff'),
  backgroundColor: z.string().optional(),
  position: z.enum(['top', 'center', 'bottom']).default('bottom'),
});

const CalloutBoxArrowPropsSchema = z.object({
  text: z.string().optional(),
  targetX: z.number().default(540),
  targetY: z.number().default(960),
  boxWidth: z.number().default(300),
  boxHeight: z.number().default(100),
  arrowPosition: z.enum(['top', 'bottom', 'left', 'right']).default('bottom'),
  strokeColor: z.string().default('#ff0000'),
  fillColor: z.string().default('#ffffff'),
  strokeWidth: z.number().default(3),
});

const IntroTitleCardPropsSchema = z.object({
  title: z.string().default('Title'),
  subtitle: z.string().optional(),
  logoAssetId: z.string().optional(),
  backgroundColor: z.string().default('#1a1a2e'),
  titleColor: z.string().default('#ffffff'),
  subtitleColor: z.string().default('#a0a0a0'),
  accentColor: z.string().optional().default('#8B5CF6'),
});

const OutroCTAPropsSchema = z.object({
  heading: z.string().default('Get Started'),
  ctaText: z.string().default('Learn More'),
  url: z.string().optional(),
  logoAssetId: z.string().optional(),
  backgroundColor: z.string().default('#1a1a2e'),
  textColor: z.string().default('#ffffff'),
  buttonColor: z.string().default('#3b82f6'),
  buttonTextColor: z.string().default('#ffffff'),
});

const ImageSlideshowPropsSchema = z.object({
  slides: z.array(
    z.object({
      assetId: z.string(),
      duration: z.number().default(5),
      kenBurns: z.enum(['zoomIn', 'zoomOut', 'panRight', 'panLeft', 'none']).optional().default('zoomIn'),
      caption: z.string().optional(),
    })
  ).default([]),
  transitionDuration: z.number().optional().default(20),
  backgroundColor: z.string().optional().default('#000000'),
  captionColor: z.string().optional().default('#ffffff'),
  captionBackgroundColor: z.string().optional().default('rgba(0, 0, 0, 0.5)'),
});

const TextRevealPropsSchema = z.object({
  text: z.string().default('Hello World'),
  style: z.enum(['typewriter', 'fadeIn', 'slideUp', 'wordPop', 'glitch']).default('fadeIn'),
  fontSize: z.number().optional().default(96),
  fontFamily: z.string().optional().default('Inter, sans-serif'),
  color: z.string().optional().default('#ffffff'),
  backgroundColor: z.string().optional().default('transparent'),
  align: z.enum(['left', 'center', 'right']).optional().default('center'),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional().default('center'),
});

const TerminalWindowPropsSchema = z.object({
  command: z.string().default('echo "Hello World"'),
  output: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional().default('light'),
  rotationY: z.number().optional().default(20),
  slideDirection: z.enum(['up', 'down', 'left', 'right']).optional().default('up'),
  fontSize: z.number().optional().default(32),
  fontFamily: z.string().optional().default('Monaco, Courier, monospace'),
});

const KineticTypographyPropsSchema = z.object({
  lines: z.array(z.string()).default(['Line 1', 'Line 2', 'Line 3']),
  animationStyle: z.enum(['bounce', 'scale', 'rotate', 'slide', 'fade']).optional().default('bounce'),
  timing: z.enum(['word', 'line']).optional().default('line'),
  stagger: z.number().optional().default(15),
  fontSize: z.number().optional().default(96),
  fontFamily: z.string().optional().default('Inter, sans-serif'),
  color: z.string().optional().default('#ffffff'),
  backgroundColor: z.string().optional().default('transparent'),
  align: z.enum(['left', 'center', 'right']).optional().default('center'),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional().default('center'),
  emphasizeColor: z.string().optional(),
});

const BrandLogoPropsSchema = z.object({
  logoAssetId: z.string().default(''),
  animationType: z.enum(['bounce', 'pulse', 'slide', 'rotate', 'fade']).optional().default('bounce'),
  scale: z.number().optional().default(1.5),
  position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional().default('center'),
  loop: z.boolean().optional().default(false),
});

const CountUpNumberPropsSchema = z.object({
  from: z.number().default(0),
  to: z.number().default(100),
  duration: z.number().optional().default(2),
  suffix: z.string().optional().default(''),
  prefix: z.string().optional().default(''),
  decimals: z.number().optional().default(0),
  fontSize: z.number().optional().default(120),
  fontFamily: z.string().optional().default('Inter, sans-serif'),
  color: z.string().optional().default('#ffffff'),
  backgroundColor: z.string().optional().default('transparent'),
  align: z.enum(['left', 'center', 'right']).optional().default('center'),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional().default('center'),
});

const ProgressBarPropsSchema = z.object({
  progress: z.number().default(75),
  label: z.string().optional(),
  showPercentage: z.boolean().optional().default(true),
  animated: z.boolean().optional().default(true),
  color: z.string().optional().default('#00d9ff'),
  backgroundColor: z.string().optional().default('rgba(255, 255, 255, 0.1)'),
  height: z.number().optional().default(40),
  borderRadius: z.number().optional().default(20),
  position: z.enum(['top', 'center', 'bottom']).optional().default('center'),
});

export const SKILL_REGISTRY: Record<SkillType, SkillDefinition> = {
  LowerThird: {
    id: 'LowerThird',
    name: 'Lower Third',
    component: LowerThird,
    defaultDuration: 5,
    defaultProps: LowerThirdPropsSchema.parse({}),
    propsSchema: LowerThirdPropsSchema,
  },
  CaptionsPop: {
    id: 'CaptionsPop',
    name: 'Captions Pop',
    component: CaptionsPop,
    defaultDuration: 10,
    defaultProps: CaptionPropsSchema.parse({}),
    propsSchema: CaptionPropsSchema,
  },
  CalloutBoxArrow: {
    id: 'CalloutBoxArrow',
    name: 'Callout Box',
    component: CalloutBoxArrow,
    defaultDuration: 4,
    defaultProps: CalloutBoxArrowPropsSchema.parse({}),
    propsSchema: CalloutBoxArrowPropsSchema,
  },
  IntroTitleCard: {
    id: 'IntroTitleCard',
    name: 'Intro Title',
    component: IntroTitleCard,
    defaultDuration: 3,
    defaultProps: IntroTitleCardPropsSchema.parse({}),
    propsSchema: IntroTitleCardPropsSchema,
  },
  OutroCTA: {
    id: 'OutroCTA',
    name: 'Outro CTA',
    component: OutroCTA,
    defaultDuration: 5,
    defaultProps: OutroCTAPropsSchema.parse({}),
    propsSchema: OutroCTAPropsSchema,
  },
  ImageSlideshow: {
    id: 'ImageSlideshow',
    name: 'Image Slideshow',
    component: ImageSlideshow,
    defaultDuration: 15,
    defaultProps: ImageSlideshowPropsSchema.parse({}),
    propsSchema: ImageSlideshowPropsSchema,
  },
  TextReveal: {
    id: 'TextReveal',
    name: 'Text Reveal',
    component: TextReveal,
    defaultDuration: 5,
    defaultProps: TextRevealPropsSchema.parse({}),
    propsSchema: TextRevealPropsSchema,
  },
  TerminalWindow: {
    id: 'TerminalWindow',
    name: 'Terminal Window',
    component: TerminalWindow,
    defaultDuration: 5,
    defaultProps: TerminalWindowPropsSchema.parse({}),
    propsSchema: TerminalWindowPropsSchema,
  },
  KineticTypography: {
    id: 'KineticTypography',
    name: 'Kinetic Typography',
    component: KineticTypography,
    defaultDuration: 8,
    defaultProps: KineticTypographyPropsSchema.parse({}),
    propsSchema: KineticTypographyPropsSchema,
  },
  BrandLogo: {
    id: 'BrandLogo',
    name: 'Brand Logo',
    component: BrandLogo,
    defaultDuration: 3,
    defaultProps: BrandLogoPropsSchema.parse({}),
    propsSchema: BrandLogoPropsSchema,
  },
  CountUpNumber: {
    id: 'CountUpNumber',
    name: 'Count Up Number',
    component: CountUpNumber,
    defaultDuration: 3,
    defaultProps: CountUpNumberPropsSchema.parse({}),
    propsSchema: CountUpNumberPropsSchema,
  },
  ProgressBar: {
    id: 'ProgressBar',
    name: 'Progress Bar',
    component: ProgressBar,
    defaultDuration: 3,
    defaultProps: ProgressBarPropsSchema.parse({}),
    propsSchema: ProgressBarPropsSchema,
  },
};

export const SKILL_TYPES = Object.keys(SKILL_REGISTRY) as SkillType[];
