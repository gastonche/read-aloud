import React from 'react';
import { COLORS, GRADIENT, FONT } from '../theme';

type Props = {
  speed?: string;
  playing?: boolean;
  glow?: number;
};

export const ControlDeck: React.FC<Props> = ({
  speed = '1×',
  playing = true,
  glow = 0,
}) => {
  return (
    <div
      style={{
        width: 96,
        padding: '20px 0',
        borderRadius: 48,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 24px 60px rgba(79,70,229,${0.18 + glow * 0.25}), 0 2px 0 rgba(255,255,255,0.6) inset`,
        border: '1px solid rgba(99,102,241,0.18)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: GRADIENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: 22,
          boxShadow: '0 6px 16px rgba(139,92,246,0.35)',
        }}
      >
        ◐
      </div>

      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: GRADIENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 24px rgba(79,70,229,${0.35 + glow * 0.3})`,
        }}
      >
        {playing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={bar} />
            <span style={bar} />
          </div>
        ) : (
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '11px solid transparent',
              borderBottom: '11px solid transparent',
              borderLeft: '18px solid white',
              marginLeft: 5,
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: '6px 12px',
          borderRadius: 20,
          background: COLORS.wash,
          color: COLORS.indigo,
          fontWeight: 700,
          fontSize: 18,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {speed}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          opacity: 0.5,
        }}
      >
        <span style={dot} />
        <span style={dot} />
        <span style={dot} />
      </div>
    </div>
  );
};

const bar: React.CSSProperties = {
  width: 7,
  height: 22,
  borderRadius: 3,
  background: 'white',
};
const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: COLORS.slate,
};
