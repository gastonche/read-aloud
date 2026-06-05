import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  random,
} from 'remotion';
import { COLORS, FONT } from '../theme';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const TITLES = [
  'The case for slow productivity',
  'How memory actually works',
  'A field guide to deep focus',
  'Why your tabs keep multiplying',
  'Notes on attention',
  'The science of walking',
  'Letters to a young researcher',
  'On finishing what you start',
  'The long read you saved',
  'Quarterly report — Q2',
  'Annual review draft v3',
  'Newsletter: this week in tech',
];

export const Act1Weight: React.FC = () => {
  const frame = useCurrentFrame();

  const tip = interpolate(frame, [150, 230], [0, 7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  const fatigue = interpolate(frame, [150, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.nightTop}, ${COLORS.nightBottom})`,
      }}
    >
      <Sequence durationInFrames={70} layout="none">
        <LaterTitle />
      </Sequence>

      <Sequence from={50} layout="none">
        <AbsoluteFill
          style={{
            transform: `perspective(1400px) rotateX(${tip}deg)`,
            transformOrigin: '50% 80%',
          }}
        >
          {TITLES.map((title, i) => (
            <PileCard key={i} index={i} title={title} />
          ))}
        </AbsoluteFill>
      </Sequence>

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(10,8,24,0.85) 100%)',
          opacity: 0.4 + fatigue * 0.5,
          mixBlendMode: 'multiply',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(60% 40% at 50% 42%, rgba(99,102,241,0.10), transparent 70%)',
          opacity: fatigue,
        }}
      />

      <WeightCaption />
    </AbsoluteFill>
  );
};

const WeightCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [156, 184], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [156, 190], [22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 150,
        opacity: op,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          fontFamily: FONT.display,
          fontWeight: 500,
          fontStyle: 'italic',
          fontSize: 52,
          lineHeight: 1.35,
          color: '#d7d2ee',
          textAlign: 'center',
          maxWidth: 1300,
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}
      >
        There&rsquo;s more worth reading than any
        <br />
        pair of eyes can keep up with.
      </div>
    </AbsoluteFill>
  );
};

const LaterTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [6, 18, 50, 66], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });
  const caret = Math.floor(frame / 16) % 2 === 0 ? 1 : 0.1;
  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', opacity }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 120,
          fontStyle: 'italic',
          fontWeight: 500,
          color: '#cfcae8',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Later
        <span
          style={{
            display: 'inline-block',
            width: 5,
            height: 96,
            marginLeft: 14,
            background: '#cfcae8',
            opacity: caret,
            transform: 'translateY(6px)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const PileCard: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const appear = index * 7;
  const p = interpolate(frame, [appear, appear + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  // deterministic jitter per card
  const jx = (random(`x${index}`) - 0.5) * 120;
  const jr = (random(`r${index}`) - 0.5) * 10;
  const stackY = 540 - index * 34;
  const fromY = -260;
  const y = interpolate(p, [0, 1], [fromY, stackY]);
  const rot = interpolate(p, [0, 1], [jr * 2.4, jr]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - 220 + jx,
        top: y,
        width: 440,
        height: 96,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.96)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
        transform: `rotate(${rot}deg)`,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 22px',
        border: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          background: COLORS.wash,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: FONT.body,
            fontWeight: 600,
            fontSize: 19,
            color: COLORS.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 8,
            height: 7,
            width: '70%',
            borderRadius: 4,
            background: '#e7e5f2',
          }}
        />
      </div>
    </div>
  );
};
