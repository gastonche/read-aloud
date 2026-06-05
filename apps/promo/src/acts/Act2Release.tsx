import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  random,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { HighlightWash } from "../components/HighlightWash";
import { AudioRibbons } from "../components/AudioRibbons";
import { ARTICLE_WORDS } from "../timeline";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Act II local frames: 0..270 (9s). The highlight sweep is purely visual.
export const Act2Release: React.FC = () => {
  const frame = useCurrentFrame();

  // reading head synced to the diegetic clip's speech window (see timeline.ts)
  const head = interpolate(frame, [21, 141], [0, ARTICLE_WORDS.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // night -> warm paper as the sweep lands
  const warm = interpolate(frame, [120, 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  // page enters as the first word ignites
  const pageIn = interpolate(frame, [4, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  // page settles upward in phase B so the VO2 statement can take center
  const settle = interpolate(frame, [150, 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const pageY = interpolate(settle, [0, 1], [0, -150]);
  const pageScale = interpolate(settle, [0, 1], [1, 0.86]);

  // VO2 statement (phase B)
  const vo2In = interpolate(frame, [158, 184], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  // clutter dissolving into ribbons
  const clutterOut = interpolate(frame, [0, 60], [1, 0], {
    extrapolateRight: "clamp",
  });
  const ribbonsIn = interpolate(frame, [40, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.nightTop}, ${COLORS.nightBottom})`,
      }}
    >
      {/* warm paper crossfade */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${COLORS.cream}, ${COLORS.paper})`,
          opacity: warm,
        }}
      />

      {/* leftover clutter dissolving */}
      <AbsoluteFill style={{ opacity: clutterOut }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const fall = interpolate(frame, [0, 60], [0, 240 + i * 30], {
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 200 + (random(`cx${i}`) * 1500),
                top: 200 + random(`cy${i}`) * 500 + fall,
                width: 360,
                height: 80,
                borderRadius: 14,
                background: "rgba(255,255,255,0.9)",
                opacity: 0.5,
                transform: `rotate(${(random(`cr${i}`) - 0.5) * 14}deg)`,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* calm audio ribbons the clutter becomes */}
      <AbsoluteFill
        style={{
          opacity: ribbonsIn * (0.35 + warm * 0.35),
          transform: `translateY(${interpolate(settle, [0, 1], [120, 230])}px)`,
        }}
      >
        <AudioRibbons count={5} amplitude={46} speed={0.8} />
      </AbsoluteFill>

      {/* the page being read */}
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            transform: `translateY(${pageY}px) scale(${pageScale * (0.96 + pageIn * 0.04)})`,
            opacity: pageIn,
            width: 1180,
            padding: "70px 84px",
            borderRadius: 36,
            background: warm > 0.5 ? "rgba(255,255,255,0.92)" : "rgba(20,17,40,0.55)",
            boxShadow:
              warm > 0.5
                ? "0 40px 90px rgba(79,70,229,0.18)"
                : "0 40px 90px rgba(0,0,0,0.5)",
            border: "1px solid rgba(99,102,241,0.16)",
            backdropFilter: "blur(8px)",
          }}
        >
          <HighlightWash words={ARTICLE_WORDS} head={head} fontSize={62} />
        </div>
      </AbsoluteFill>

      {/* VO2 statement — phase B */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 200,
          opacity: vo2In,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 64,
            color: COLORS.ink,
            textAlign: "center",
            transform: `translateY(${interpolate(vo2In, [0, 1], [20, 0])}px)`,
            maxWidth: 1300,
          }}
        >
          Turns any page into clear,{" "}
          <span style={{ color: COLORS.indigo }}>natural speech.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
