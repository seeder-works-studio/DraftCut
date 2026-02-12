import { z } from 'zod';
import type { SkillType } from '@/lib/spec/types';
import { LowerThird, type LowerThirdProps } from './LowerThird';
import { CaptionsPop, type CaptionsPopProps } from './CaptionsPop';
import { CalloutBoxArrow, type CalloutBoxArrowProps } from './CalloutBoxArrow';
import { IntroTitleCard, type IntroTitleCardProps } from './IntroTitleCard';
import { OutroCTA, type OutroCTAProps } from './OutroCTA';

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
  fontSize: z.number().default(48),
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
};

export const SKILL_TYPES = Object.keys(SKILL_REGISTRY) as SkillType[];
