import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

type Props = {
  children: React.ReactNode;
  appear?: number;
  size?: number;
};

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

export const Hi: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: COLORS.indigo }}>{children}</span>
);
