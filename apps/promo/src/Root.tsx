import React from 'react';
import { Composition } from 'remotion';
import { PlanA } from './PlanA';
import { PlanB, PLANB_TOTAL } from './PlanB';
import { TOTAL } from './timeline';
import { FPS } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PlanA"
        component={PlanA}
        durationInFrames={TOTAL}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ musicSrc: 'music/inspired-kevinmacleod.mp3' }}
      />

      <Composition
        id="PlanB"
        component={PlanB}
        durationInFrames={PLANB_TOTAL}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ musicSrc: 'music/blippy-trance-kevinmacleod.mp3' }}
      />
    </>
  );
};
