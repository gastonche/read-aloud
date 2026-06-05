import React from 'react';
import { interpolate, Easing } from 'remotion';
import { COLORS, GRADIENT, FONT } from '../theme';

type Props = {
  /** 0..1 draw-on progress */
  reveal: number;
  /** 0..1 position of the wash sweeping through the letters */
  sweep: number;
  fontSize?: number;
};

export const Wordmark: React.FC<Props> = ({ reveal, sweep, fontSize = 96 }) => {
  const r = interpolate(reveal, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const dotScale = interpolate(reveal, [0.5, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // little overshoot
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: fontSize * 0.28,
        opacity: r,
        transform: `translateY(${(1 - r) * 18}px)`,
      }}
    >
      {/* mark: the highlight "dot" */}
      <div
        style={{
          width: fontSize * 0.92,
          height: fontSize * 0.92,
          borderRadius: fontSize * 0.28,
          background: GRADIENT,
          transform: `scale(${dotScale})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(79,70,229,0.4)',
        }}
      >
        <div
          style={{
            width: '46%',
            height: '12%',
            borderRadius: 99,
            background: COLORS.wash,
          }}
        />
      </div>

      {/* wordmark with a wash sweeping through */}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize,
            letterSpacing: '-0.02em',
            color: COLORS.ink,
          }}
        >
          ReadAloud
        </span>
        {/* sweeping wash glint */}
        <span
          style={{
            position: 'absolute',
            inset: '-0.1em -0.2em',
            background: `linear-gradient(100deg, transparent ${sweep * 100 - 14}%, ${COLORS.wash} ${sweep * 100}%, transparent ${sweep * 100 + 14}%)`,
            mixBlendMode: 'multiply',
            borderRadius: 12,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};
