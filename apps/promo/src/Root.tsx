import React from "react";
import { Composition } from "remotion";
import { PlanA } from "./PlanA";
import { PlanB, PLANB_TOTAL } from "./PlanB";
import { TOTAL } from "./timeline";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Plan A — 16:9 hero, 30s, emotional/aspirational (landing, YouTube) */}
      <Composition
        id="PlanA"
        component={PlanA}
        durationInFrames={TOTAL}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ musicSrc: "music/inspired-kevinmacleod.mp3" }}
      />

      {/* Plan B — 9:16 "Speed Read", 15s, fast feature-demo (Reels/TikTok/Shorts) */}
      <Composition
        id="PlanB"
        component={PlanB}
        durationInFrames={PLANB_TOTAL}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ musicSrc: "music/blippy-trance-kevinmacleod.mp3" }}
      />
    </>
  );
};
