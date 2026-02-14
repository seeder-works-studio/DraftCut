import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, Img, Sequence, staticFile } from 'remotion';
import { kenBurnsZoomIn, kenBurnsZoomOut, kenBurnsPanRight, kenBurnsPanLeft, crossFade } from '@/lib/animations/primitives';

export type KenBurnsEffect = 'zoomIn' | 'zoomOut' | 'panRight' | 'panLeft' | 'none';

export interface ImageSlide {
  assetId: string;
  assetUrl?: string; // Optional blob URL passed from parent
  duration: number;
  kenBurns?: KenBurnsEffect;
  caption?: string;
}

export interface ImageSlideshowProps {
  slides: ImageSlide[];
  assetBlobUrls?: Record<string, string>; // Map of assetId to blob URL
  transitionDuration?: number;
  backgroundColor?: string;
  captionColor?: string;
  captionBackgroundColor?: string;
}

export const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  slides,
  assetBlobUrls = {},
  transitionDuration = 20,
  backgroundColor = '#000000',
  captionColor = '#ffffff',
  captionBackgroundColor = 'rgba(0, 0, 0, 0.5)',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Helper to resolve asset URL
  const getAssetUrl = (slide: ImageSlide) => {
    // Priority: explicit assetUrl > blob URLs map > fallback to asset ID
    return slide.assetUrl || assetBlobUrls[slide.assetId] || slide.assetId;
  };

  let currentTime = 0;
  const slideTimings = slides.map((slide) => {
    const start = currentTime;
    currentTime += slide.duration;
    return { start, end: currentTime };
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {slides.map((slide, index) => {
        const timing = slideTimings[index];
        const slideFrame = frame - timing.start * fps;
        const slideDurationInFrames = slide.duration * fps;

        // Don't render if not in time range (with transition overlap)
        const transitionOverlap = transitionDuration / 2;
        if (
          frame < (timing.start - transitionOverlap / fps) * fps ||
          frame > (timing.end + transitionOverlap / fps) * fps
        ) {
          return null;
        }

        // Calculate Ken Burns effect
        let transform = { scale: 1, x: 0, y: 0 };
        if (slide.kenBurns && slide.kenBurns !== 'none') {
          const kenBurnsConfig = {
            frame: slideFrame,
            fps,
            durationInFrames: slideDurationInFrames,
          };

          switch (slide.kenBurns) {
            case 'zoomIn':
              transform = kenBurnsZoomIn(kenBurnsConfig);
              break;
            case 'zoomOut':
              transform = kenBurnsZoomOut(kenBurnsConfig);
              break;
            case 'panRight':
              transform = kenBurnsPanRight(kenBurnsConfig);
              break;
            case 'panLeft':
              transform = kenBurnsPanLeft(kenBurnsConfig);
              break;
          }
        }

        // Calculate opacity for cross-fade transitions
        let opacity = 1;

        // Fade in at start (if first slide or during transition)
        if (index === 0 && slideFrame >= 0 && slideFrame < transitionDuration) {
          const fadeTransition = crossFade({
            frame: Math.max(0, slideFrame),
            fps,
            durationInFrames: transitionDuration,
          });
          opacity = fadeTransition.inOpacity;
        }
        // Fade out at end (if not last slide)
        else if (index < slides.length - 1 && slideFrame >= 0) {
          const remainingFrames = slideDurationInFrames - slideFrame;
          if (remainingFrames >= 0 && remainingFrames < transitionDuration) {
            // Calculate fade-out progress (0 = start fading, transitionDuration = fully faded)
            const fadeOutProgress = transitionDuration - remainingFrames;
            const fadeTransition = crossFade({
              frame: Math.max(0, fadeOutProgress),
              fps,
              durationInFrames: transitionDuration,
            });
            opacity = fadeTransition.outOpacity;
          }
        }

        return (
          <Sequence
            key={`${slide.assetId}-${index}`}
            from={Math.floor(timing.start * fps)}
            durationInFrames={Math.ceil(slide.duration * fps)}
          >
            <AbsoluteFill
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                opacity,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                <Img
                  src={getAssetUrl(slide)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {slide.caption && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 60,
                    left: 40,
                    right: 40,
                    padding: '15px 25px',
                    backgroundColor: captionBackgroundColor,
                    borderRadius: 8,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 32,
                      color: captionColor,
                      textAlign: 'center',
                      fontWeight: '500',
                      lineHeight: 1.4,
                    }}
                  >
                    {slide.caption}
                  </p>
                </div>
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
