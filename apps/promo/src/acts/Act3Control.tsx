import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
  Sequence,
} from "remotion";
import { COLORS, GRADIENT, FONT } from "../theme";
import { ControlDeck } from "../components/ControlDeck";
import { PersonSilhouette } from "../components/PersonSilhouette";
import { AudioRibbons } from "../components/AudioRibbons";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Act III local frames: 0..200 (6.667s). Crisp, springy — "responsive".
export const Act3Control: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // deck slides from off-left and snaps to the corner (spring = tactile)
  const snap = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const deckX = interpolate(snap, [0, 1], [-200, 80]);
  // speed dial climbs 1x -> 1.75x
  const speedT = interpolate(frame, [38, 60], [1, 1.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const speedLabel = `${speedT.toFixed(2).replace(/0$/, "")}×`;

  // person enters bottom-right at the end, leading into Act IV
  const personIn = spring({
    frame: frame - 140,
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.cream}, ${COLORS.paper})`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.35, transform: "translateY(300px)" }}>
        <AudioRibbons count={5} amplitude={42} speed={0.9} />
      </AbsoluteFill>

      {/* floating control deck snapping to corner */}
      <div style={{ position: "absolute", left: deckX, top: 120 }}>
        <ControlDeck speed={speedLabel} glow={snap} />
      </div>

      {/* center feature montage */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Sequence from={6} durationInFrames={60} layout="none">
          <FeatureBeat>
            <LanguageFlip />
          </FeatureBeat>
        </Sequence>
        <Sequence from={64} durationInFrames={60} layout="none">
          <FeatureBeat>
            <FileMorph />
          </FeatureBeat>
        </Sequence>
        <Sequence from={120} durationInFrames={80} layout="none">
          <FeatureBeat>
            <SummaryBeat />
          </FeatureBeat>
        </Sequence>
      </AbsoluteFill>

      {/* person leaning back, listening */}
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -40,
          opacity: personIn,
          transform: `translateY(${interpolate(personIn, [0, 1], [80, 0])}px)`,
        }}
      >
        <PersonSilhouette listen={(frame / 30) * 0.5} />
      </div>
    </AbsoluteFill>
  );
};

// fade/scale wrapper for each montage beat
const FeatureBeat: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    easing: ease,
  });
  const outP = interpolate(frame, [44, 56], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const op = Math.min(inP, outP);
  return (
    <div
      style={{
        opacity: op,
        transform: `translateY(${interpolate(inP, [0, 1], [24, 0])}px) scale(${0.96 + inP * 0.04})`,
      }}
    >
      {children}
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode; label: string }> = ({
  children,
  label,
}) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
    {children}
    <div
      style={{
        fontFamily: FONT.body,
        fontWeight: 700,
        fontSize: 34,
        color: COLORS.inkSoft,
        letterSpacing: "-0.01em",
      }}
    >
      {label}
    </div>
  </div>
);

const LanguageFlip: React.FC = () => {
  const frame = useCurrentFrame();
  const langs = [
    { t: "English", rtl: false },
    { t: "日本語", rtl: false },
    { t: "العربية", rtl: true },
  ];
  const idx = Math.min(2, Math.floor(frame / 16));
  const cur = langs[idx];
  const pop = spring({
    frame: frame - idx * 16,
    fps: 30,
    config: { damping: 12, stiffness: 200 },
  });
  return (
    <Card label="30+ languages, auto-detected">
      <div
        dir={cur.rtl ? "rtl" : "ltr"}
        style={{
          minWidth: 360,
          textAlign: "center",
          padding: "26px 52px",
          borderRadius: 28,
          background: "white",
          boxShadow: "0 24px 60px rgba(79,70,229,0.16)",
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: 72,
          color: COLORS.indigo,
          transform: `scale(${0.8 + pop * 0.2})`,
        }}
      >
        {cur.t}
      </div>
    </Card>
  );
};

const FileMorph: React.FC = () => {
  const files = ["PDF", "EPUB", "DOCX", "TXT"];
  const frame = useCurrentFrame();
  return (
    <Card label="PDFs, ebooks, docs — not just web pages">
      <div style={{ display: "flex", gap: 22 }}>
        {files.map((f, i) => {
          const pop = spring({
            frame: frame - i * 6,
            fps: 30,
            config: { damping: 13, stiffness: 180 },
          });
          return (
            <div
              key={f}
              style={{
                width: 120,
                height: 150,
                borderRadius: 18,
                background: GRADIENT,
                color: "white",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 16,
                fontFamily: FONT.body,
                fontWeight: 800,
                fontSize: 24,
                transform: `translateY(${interpolate(pop, [0, 1], [40, 0])}px) scale(${pop})`,
                boxShadow: "0 18px 40px rgba(99,102,241,0.3)",
              }}
            >
              {f}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const SummaryBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [0, 1, 2];
  return (
    <Card label="Too long? Get the TL;DR — read aloud too">
      <div
        style={{
          width: 560,
          padding: 36,
          borderRadius: 24,
          background: "white",
          boxShadow: "0 24px 60px rgba(79,70,229,0.16)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: 16,
            background: COLORS.wash,
            color: COLORS.indigo,
            fontFamily: FONT.body,
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 22,
          }}
        >
          ✦ AI summary
        </div>
        {lines.map((l) => {
          const w = interpolate(frame, [14 + l * 8, 30 + l * 8], [0, [88, 96, 64][l]], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          return (
            <div
              key={l}
              style={{
                height: 16,
                width: `${w}%`,
                borderRadius: 8,
                background: l === 2 ? "#cdd0ec" : COLORS.indigoBright,
                marginBottom: 16,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
    </Card>
  );
};
