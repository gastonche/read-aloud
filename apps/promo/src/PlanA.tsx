import React from 'react';
import { AbsoluteFill, Sequence, staticFile, interpolate } from 'remotion';
import { Audio } from '@remotion/media';
import { ACTS, TOTAL, sec } from './timeline';
import { Act1Weight } from './acts/Act1Weight';
import { Act2Release } from './acts/Act2Release';
import { Act3Control } from './acts/Act3Control';
import { Act4Turn } from './acts/Act4Turn';
import './fonts';

export type PlanAProps = {
  /** Background music in public/music. Defaults to the bundled CC-BY track. */
  musicSrc?: string;
};

// Music level + fades (frames, composition timeline).
const MUSIC_VOL = 0.82;
const FADE_IN = sec(1.5);
const FADE_OUT_START = TOTAL - sec(2.5);

export const PlanA: React.FC<PlanAProps> = ({
  musicSrc = 'music/inspired-kevinmacleod.mp3',
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0e0c1d' }}>
      {/* ---------- VISUALS ---------- */}
      <Sequence from={ACTS.I.from} durationInFrames={ACTS.I.duration}>
        <Act1Weight />
      </Sequence>
      <Sequence from={ACTS.II.from} durationInFrames={ACTS.II.duration}>
        <Act2Release />
      </Sequence>
      <Sequence from={ACTS.III.from} durationInFrames={ACTS.III.duration}>
        <Act3Control />
      </Sequence>
      <Sequence from={ACTS.IV.from} durationInFrames={ACTS.IV.duration}>
        <Act4Turn />
      </Sequence>

      {/* subtle global grain/vignette for a premium finish */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(130% 100% at 50% 45%, transparent 60%, rgba(14,12,29,0.22) 100%)',
        }}
      />

      {/* ---------- AUDIO ---------- */}
      {/* Music only — no voiceover. The story is carried by motion + on-screen
          text. Track: "Inspired" by Kevin MacLeod (incompetech.com),
          licensed CC BY 4.0 — attribution required (see README). */}
      <Audio
        src={staticFile(musicSrc)}
        trimAfter={TOTAL + 2}
        volume={(f) =>
          interpolate(
            f,
            [0, FADE_IN, FADE_OUT_START, TOTAL],
            [0, MUSIC_VOL, MUSIC_VOL, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    </AbsoluteFill>
  );
};
