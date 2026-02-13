import React from 'react';
import { Composition } from 'remotion';
import { LowerThird } from '../LowerThird';
import { CaptionsPop } from '../CaptionsPop';
import { CalloutBoxArrow } from '../CalloutBoxArrow';
import { IntroTitleCard } from '../IntroTitleCard';
import { OutroCTA } from '../OutroCTA';
import { ImageSlideshow } from '../ImageSlideshow';
import { TextReveal } from '../TextReveal';
import { TerminalWindow } from '../TerminalWindow';
import { KineticTypography } from '../KineticTypography';
import { BrandLogo } from '../BrandLogo';
import { CountUpNumber } from '../CountUpNumber';
import { ProgressBar } from '../ProgressBar';
import { SKILL_REGISTRY } from '../registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = Composition as React.FC<any>;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <C
        id="LowerThird"
        component={LowerThird}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.LowerThird.defaultProps}
      />
      <C
        id="CaptionsPop"
        component={CaptionsPop}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.CaptionsPop.defaultProps}
      />
      <C
        id="CalloutBoxArrow"
        component={CalloutBoxArrow}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.CalloutBoxArrow.defaultProps}
      />
      <C
        id="IntroTitleCard"
        component={IntroTitleCard}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.IntroTitleCard.defaultProps}
      />
      <C
        id="OutroCTA"
        component={OutroCTA}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.OutroCTA.defaultProps}
      />
      <C
        id="ImageSlideshow"
        component={ImageSlideshow}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.ImageSlideshow.defaultProps}
      />
      <C
        id="TextReveal"
        component={TextReveal}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.TextReveal.defaultProps}
      />
      <C
        id="TerminalWindow"
        component={TerminalWindow}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.TerminalWindow.defaultProps}
      />
      <C
        id="KineticTypography"
        component={KineticTypography}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.KineticTypography.defaultProps}
      />
      <C
        id="BrandLogo"
        component={BrandLogo}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.BrandLogo.defaultProps}
      />
      <C
        id="CountUpNumber"
        component={CountUpNumber}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.CountUpNumber.defaultProps}
      />
      <C
        id="ProgressBar"
        component={ProgressBar}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SKILL_REGISTRY.ProgressBar.defaultProps}
      />
    </>
  );
};
