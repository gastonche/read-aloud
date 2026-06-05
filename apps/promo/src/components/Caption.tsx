import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

type Props = {
  children: React.ReactNode;
  /** frame the caption should pop in (local) */
  appear?: number;
  /** highlight word(s) wrapped via <b> get the indigo accent */
  size?: number;
};

// Burned-in social caption: bold, high-contrast, springy pop-in, readable muted.
export const Caption: React.FC<Props> = ({
  children,
  appear = 0,
  size = 72,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame: frame - appear,
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  const op = interpolate(frame, [appear, appear + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity: op,
        transform: `translateY(${interpolate(pop, [0, 1], [40, 0])}px) scale(${0.86 + pop * 0.14})`,
        fontFamily: FONT.body,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: COLORS.ink,
        textAlign: 'center',
        maxWidth: 920,
        textWrap: 'balance',
      }}
    >
      {children}
    </div>
  );
};

// inline accent helper for caption emphasis
export const Hi: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: COLORS.indigo }}>{children}</span>
);
