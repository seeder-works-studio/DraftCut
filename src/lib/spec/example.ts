import type { ProjectSpec } from './types';

export const exampleProjectSpec: ProjectSpec = {
  version: '1.0.0',
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    description: 'Example 20s promo video',
  },
  canvas: {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 20,
    backgroundColor: '#000000',
  },
  assets: [],
  composition: {
    tracks: [
      {
        id: 'track-video',
        type: 'video',
        clips: [],
      },
      {
        id: 'track-overlay',
        type: 'overlay',
        clips: [
          {
            id: 'clip-intro',
            type: 'skill',
            startTime: 0,
            duration: 3,
            skillType: 'IntroTitleCard',
            skillProps: {
              title: 'Welcome',
              subtitle: 'An AI-Generated Video',
              backgroundColor: '#1a1a2e',
              titleColor: '#ffffff',
              subtitleColor: '#a0a0a0',
            },
          },
          {
            id: 'clip-lower-third',
            type: 'skill',
            startTime: 5,
            duration: 5,
            skillType: 'LowerThird',
            skillProps: {
              name: 'John Doe',
              title: 'CEO, Example Corp',
              position: 'bottom-left',
              backgroundColor: '#1a1a1a',
              textColor: '#ffffff',
            },
          },
          {
            id: 'clip-outro',
            type: 'skill',
            startTime: 15,
            duration: 5,
            skillType: 'OutroCTA',
            skillProps: {
              heading: 'Get Started Today',
              ctaText: 'Learn More',
              url: 'example.com',
              backgroundColor: '#1a1a2e',
              textColor: '#ffffff',
              buttonColor: '#3b82f6',
              buttonTextColor: '#ffffff',
            },
          },
        ],
      },
      {
        id: 'track-audio',
        type: 'audio',
        clips: [],
      },
    ],
  },
};
