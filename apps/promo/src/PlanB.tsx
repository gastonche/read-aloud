import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, GRADIENT, FONT } from './theme';
import { HighlightWash } from './components/HighlightWash';
import { AudioRibbons } from './components/AudioRibbons';
import { ControlDeck } from './components/ControlDeck';
import { Wordmark } from './components/Wordmark';
import { Caption, Hi } from './components/Caption';
import { ARTICLE_WORDS } from './timeline';
import './fonts';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const W = 1080;
const H = 1920;
export const PLANB_TOTAL = 450; // 15s @ 30fps

// Cuts land on a tight grid so they ride the music's pulse.
const B = {
  hook: { from: 0, dur: 60 },
  voices: { from: 60, dur: 60 },
  speed: { from: 120, dur: 48 },
  files: { from: 168, dur: 54 },
  langs: { from: 222, dur: 48 },
  summary: { from: 270, dur: 60 },
  control: { from: 330, dur: 54 },
  privacy: { from: 384, dur: 24 },
  offer: { from: 408, dur: 42 },
};

export type PlanBProps = { musicSrc?: string };

export const PlanB: React.FC<PlanBProps> = ({
  musicSrc = 'music/blippy-trance-kevinmacleod.mp3',
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.cream}, ${COLORS.paper})`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.3, transform: 'translateY(700px)' }}>
        <AudioRibbons
          count={5}
          amplitude={40}
          speed={1.1}
          width={W}
          height={H}
        />
      </AbsoluteFill>

      <Sequence from={B.hook.from} durationInFrames={B.hook.dur}>
        <Hook />
      </Sequence>
      <Sequence from={B.voices.from} durationInFrames={B.voices.dur}>
        <Voices />
      </Sequence>
      <Sequence from={B.speed.from} durationInFrames={B.speed.dur}>
        <Speed />
      </Sequence>
      <Sequence from={B.files.from} durationInFrames={B.files.dur}>
        <Files />
      </Sequence>
      <Sequence from={B.langs.from} durationInFrames={B.langs.dur}>
        <Languages />
      </Sequence>
      <Sequence from={B.summary.from} durationInFrames={B.summary.dur}>
        <Summary />
      </Sequence>
      <Sequence from={B.control.from} durationInFrames={B.control.dur}>
        <Control />
      </Sequence>
      <Sequence from={B.privacy.from} durationInFrames={B.privacy.dur}>
        <Privacy />
      </Sequence>
      <Sequence from={B.offer.from} durationInFrames={B.offer.dur}>
        <Offer />
      </Sequence>

      <ProgressBar />

      <Audio
        src={staticFile(musicSrc)}
        trimAfter={PLANB_TOTAL + 2}
        volume={(f) =>
          interpolate(
            f,
            [0, 12, PLANB_TOTAL - 14, PLANB_TOTAL],
            [0, 0.8, 0.8, 0],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            },
          )
        }
      />
    </AbsoluteFill>
  );
};

const Stage: React.FC<{
  children: React.ReactNode;
  caption: React.ReactNode;
}> = ({ children, caption }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 90,
        transform: 'translateY(-40px)',
      }}
    >
      <div style={{ minHeight: 460, display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
      <Caption appear={4} size={78}>
        {caption}
      </Caption>
    </div>
  </AbsoluteFill>
);

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [6, 52], [0, ARTICLE_WORDS.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <Stage
      caption={
        <>
          It reads any page <Hi>out loud.</Hi>
        </>
      }
    >
      <div
        style={{
          width: 880,
          padding: '56px 60px',
          borderRadius: 40,
          background: 'white',
          boxShadow: '0 40px 90px rgba(79,70,229,0.18)',
          border: '1px solid rgba(99,102,241,0.16)',
        }}
      >
        <HighlightWash
          words={ARTICLE_WORDS}
          head={head}
          fontSize={58}
          maxWidth={760}
        />
      </div>
    </Stage>
  );
};

const Voices: React.FC = () => {
  const frame = useCurrentFrame();
  const names = ['◐', '◑', '◓'];
  const selected = 1;
  return (
    <Stage
      caption={
        <>
          In <Hi>human voices</Hi> you&rsquo;ll love.
        </>
      }
    >
      <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
        {names.map((g, i) => {
          const pop = spring({
            frame: frame - i * 5,
            fps: 30,
            config: { damping: 13, stiffness: 180 },
          });
          const isSel = i === selected;
          const ring = isSel
            ? interpolate(frame, [16, 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 0;
          return (
            <div
              key={i}
              style={{ position: 'relative', transform: `scale(${pop})` }}
            >
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: '50%',
                  background: GRADIENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 84,
                  boxShadow: '0 20px 50px rgba(139,92,246,0.4)',
                  opacity: isSel ? 1 : 0.55,
                }}
              >
                {g}
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: -14,
                  borderRadius: '50%',
                  border: `6px solid ${COLORS.indigo}`,
                  opacity: ring,
                }}
              />
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

const Speed: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [4, 36], [1, 3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const arc = interpolate(v, [1, 3], [0, 1]);
  const R = 150;
  const C = 2 * Math.PI * R;
  return (
    <Stage
      caption={
        <>
          As <Hi>fast</Hi> as you want.
        </>
      }
    >
      <div style={{ position: 'relative', width: 360, height: 360 }}>
        <svg width={360} height={360} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={180}
            cy={180}
            r={R}
            fill="none"
            stroke="#e7e5f2"
            strokeWidth={22}
          />
          <circle
            cx={180}
            cy={180}
            r={R}
            fill="none"
            stroke={COLORS.indigo}
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - arc)}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT.body,
            fontWeight: 800,
            fontSize: 96,
            color: COLORS.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {v.toFixed(1)}×
        </div>
      </div>
    </Stage>
  );
};

const Files: React.FC = () => {
  const frame = useCurrentFrame();
  const files = ['PDF', 'EPUB', 'DOCX', 'TXT'];
  return (
    <Stage
      caption={
        <>
          <Hi>PDFs.</Hi> Ebooks. Docs.
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          gap: 26,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 760,
        }}
      >
        {files.map((f, i) => {
          const pop = spring({
            frame: frame - i * 6,
            fps: 30,
            config: { damping: 13, stiffness: 170 },
          });
          return (
            <div
              key={f}
              style={{
                width: 168,
                height: 210,
                borderRadius: 24,
                background: GRADIENT,
                color: 'white',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 22,
                fontFamily: FONT.body,
                fontWeight: 800,
                fontSize: 34,
                transform: `translateY(${interpolate(pop, [0, 1], [60, 0])}px) scale(${pop})`,
                boxShadow: '0 22px 50px rgba(99,102,241,0.32)',
              }}
            >
              {f}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

const Languages: React.FC = () => {
  const frame = useCurrentFrame();
  const langs = [
    { t: 'English', rtl: false },
    { t: '日本語', rtl: false },
    { t: 'العربية', rtl: true },
  ];
  const idx = Math.min(2, Math.floor(frame / 13));
  const cur = langs[idx];
  const pop = spring({
    frame: frame - idx * 13,
    fps: 30,
    config: { damping: 12, stiffness: 220 },
  });
  return (
    <Stage
      caption={
        <>
          <Hi>30+</Hi> languages.
        </>
      }
    >
      <div
        dir={cur.rtl ? 'rtl' : 'ltr'}
        style={{
          minWidth: 520,
          textAlign: 'center',
          padding: '40px 70px',
          borderRadius: 36,
          background: 'white',
          boxShadow: '0 30px 70px rgba(79,70,229,0.18)',
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: 110,
          color: COLORS.indigo,
          transform: `scale(${0.82 + pop * 0.18})`,
        }}
      >
        {cur.t}
      </div>
    </Stage>
  );
};

const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const widths = [92, 100, 64];
  return (
    <Stage
      caption={
        <>
          Too long? Get the <Hi>TL;DR.</Hi>
        </>
      }
    >
      <div
        style={{
          width: 760,
          padding: 46,
          borderRadius: 32,
          background: 'white',
          boxShadow: '0 30px 70px rgba(79,70,229,0.18)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 20,
            background: COLORS.wash,
            color: COLORS.indigo,
            fontFamily: FONT.body,
            fontWeight: 800,
            fontSize: 30,
            marginBottom: 32,
          }}
        >
          ✦ AI summary
        </div>
        {widths.map((wd, l) => {
          const w = interpolate(frame, [10 + l * 7, 28 + l * 7], [0, wd], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: ease,
          });
          return (
            <div
              key={l}
              style={{
                height: 22,
                width: `${w}%`,
                borderRadius: 11,
                background: l === 2 ? '#cdd0ec' : COLORS.indigoBright,
                marginBottom: 22,
              }}
            />
          );
        })}
      </div>
    </Stage>
  );
};

const Control: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const snap = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const x = interpolate(snap, [0, 1], [-240, 0]);
  return (
    <Stage
      caption={
        <>
          Controls that <Hi>stay out of the way.</Hi>
        </>
      }
    >
      <div style={{ transform: `translateX(${x}px) scale(1.25)` }}>
        <ControlDeck speed="1.75×" glow={snap} />
      </div>
    </Stage>
  );
};

const Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 200 },
  });
  return (
    <Stage
      caption={
        <>
          <Hi>No account.</Hi> Private by design.
        </>
      }
    >
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 48,
          background: GRADIENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${pop})`,
          boxShadow: '0 24px 60px rgba(79,70,229,0.35)',
        }}
      >
        <svg
          width={96}
          height={96}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={2.4}
        >
          <rect
            x="4"
            y="10.5"
            width="16"
            height="10"
            rx="2.4"
            fill="white"
            stroke="none"
          />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="white" />
        </svg>
      </div>
    </Stage>
  );
};

const Offer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sweep = interpolate(frame, [14, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const tagIn = interpolate(frame, [16, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const ctaPop = spring({
    frame: frame - 22,
    fps,
    config: { damping: 13, stiffness: 150 },
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 56,
      }}
    >
      <Wordmark reveal={reveal} sweep={sweep} fontSize={88} />
      <div
        style={{
          opacity: tagIn,
          transform: `translateY(${interpolate(tagIn, [0, 1], [16, 0])}px)`,
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: 68,
          color: COLORS.ink,
          textAlign: 'center',
          lineHeight: 1.15,
          maxWidth: 880,
        }}
      >
        Stop reading everything.
        <br />
        <span style={{ color: COLORS.indigo }}>Start listening to it.</span>
      </div>
      <div
        style={{
          transform: `scale(${0.8 + ctaPop * 0.2})`,
          opacity: ctaPop,
          padding: '28px 56px',
          borderRadius: 999,
          background: GRADIENT,
          color: 'white',
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          boxShadow: '0 24px 56px rgba(79,70,229,0.4)',
        }}
      >
        <ChromeMark />
        Add to Chrome — it&rsquo;s free
      </div>
      <div
        style={{
          opacity: ctaPop,
          fontFamily: FONT.body,
          fontWeight: 700,
          fontSize: 30,
          color: COLORS.inkSoft,
        }}
      >
        Free forever · No account
      </div>
    </AbsoluteFill>
  );
};

const ChromeMark = () => (
  <svg width={42} height={42} viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="22" fill="white" />
    <circle cx="24" cy="24" r="9" fill={COLORS.indigo} />
    <circle cx="24" cy="24" r="6" fill="white" />
  </svg>
);

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, PLANB_TOTAL], [0, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: 70,
        right: 70,
        height: 10,
        borderRadius: 6,
        background: 'rgba(99,102,241,0.15)',
      }}
    >
      <div
        style={{
          width: `${p * 100}%`,
          height: '100%',
          borderRadius: 6,
          background: GRADIENT,
        }}
      />
    </div>
  );
};
