import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  spring,
  useVideoConfig,
} from 'remotion';
import { COLORS, GRADIENT, FONT } from '../theme';
import { Wordmark } from '../components/Wordmark';
import { AudioRibbons } from '../components/AudioRibbons';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

export const Act4Turn: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.cream}, ${COLORS.paper})`,
      }}
    >
      <AbsoluteFill style={{ opacity: 0.22, transform: 'translateY(330px)' }}>
        <AudioRibbons count={5} amplitude={38} speed={0.7} />
      </AbsoluteFill>

      <Sequence durationInFrames={58} layout="none">
        <Testimonial />
      </Sequence>

      <Sequence from={50} layout="none">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

const Testimonial: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [4, 16, 44, 56], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [4, 20], [18, 0], {
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        opacity: op,
        padding: '0 260px',
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontStyle: 'italic',
            fontSize: 62,
            lineHeight: 1.3,
            color: COLORS.ink,
          }}
        >
          “The difference between finishing an article
          <br />
          and giving up halfway.”
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: FONT.body,
            fontWeight: 600,
            fontSize: 24,
            color: COLORS.inkSoft,
            opacity: 0.8,
          }}
        >
          — a reader with dyslexia
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = interpolate(frame, [0, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sweep = interpolate(frame, [24, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  const taglineIn = interpolate(frame, [48, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const ctaPop = spring({
    frame: frame - 70,
    fps,
    config: { damping: 13, stiffness: 150 },
  });
  const trustIn = interpolate(frame, [88, 108], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 44,
      }}
    >
      <Wordmark reveal={reveal} sweep={sweep} fontSize={104} />

      <div
        style={{
          opacity: taglineIn,
          transform: `translateY(${interpolate(taglineIn, [0, 1], [16, 0])}px)`,
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: 56,
          color: COLORS.ink,
          textAlign: 'center',
          maxWidth: 1200,
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
          padding: '22px 46px',
          borderRadius: 999,
          background: GRADIENT,
          color: 'white',
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 22px 50px rgba(79,70,229,0.4)',
        }}
      >
        <ChromeMark />
        Add to Chrome — it’s free
      </div>

      <div
        style={{
          opacity: trustIn,
          fontFamily: FONT.body,
          fontWeight: 600,
          fontSize: 24,
          color: COLORS.inkSoft,
          display: 'flex',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <span>No account</span>
        <Dot />
        <span>Free voices forever</span>
        <Dot />
        <span>Private by design</span>
      </div>
    </AbsoluteFill>
  );
};

const Dot = () => (
  <span
    style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: COLORS.indigoBright,
      display: 'inline-block',
    }}
  />
);

const ChromeMark = () => (
  <svg width={36} height={36} viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="22" fill="white" />
    <circle cx="24" cy="24" r="9" fill={COLORS.indigo} />
    <circle cx="24" cy="24" r="6" fill="white" />
  </svg>
);
