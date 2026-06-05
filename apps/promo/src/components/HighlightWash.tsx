import React from 'react';
import { interpolate, Easing } from 'remotion';
import { COLORS, FONT } from '../theme';

type Props = {
  words: string[];
  /** 0..words.length — the (fractional) reading head position. */
  head: number;
  fontSize: number;
  /** max width of the text block in px */
  maxWidth?: number;
  lineHeight?: number;
  weight?: number;
};

// The signature ReadAloud effect: each word lights up with the periwinkle wash
// exactly as the reading head crosses it. Read words settle to ink; the active
// word fills + gives a soft lift; unread words stay muted.
export const HighlightWash: React.FC<Props> = ({
  words,
  head,
  fontSize,
  maxWidth = 1100,
  lineHeight = 1.5,
  weight = 600,
}) => {
  return (
    <div
      style={{
        maxWidth,
        fontFamily: FONT.display,
        fontSize,
        fontWeight: weight,
        lineHeight,
        letterSpacing: '-0.01em',
        textAlign: 'left',
        display: 'flex',
        flexWrap: 'wrap',
        rowGap: fontSize * (lineHeight - 1) * 0.4,
      }}
    >
      {words.map((word, i) => {
        // local progress of the head within this word: <0 unread, 0..1 active, >1 read
        const local = head - i;
        const fill = interpolate(local, [0, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        const isActive = local > 0 && local < 1.15;

        // text color: muted slate -> full ink as the word is crossed
        const textColor = interpolateColor(fill, COLORS.slate, COLORS.ink);
        // wash background sweeps in left->right across the word
        const washOpacity = interpolate(fill, [0, 0.15, 1], [0, 0.55, 1], {
          extrapolateRight: 'clamp',
        });
        const lift = isActive
          ? interpolate(local, [0, 0.5, 1.15], [0, -3, 0])
          : 0;

        return (
          <span
            key={i}
            style={{
              position: 'relative',
              padding: '0.04em 0.16em',
              marginRight: '0.06em',
              color: textColor,
              transform: `translateY(${lift}px)`,
              borderRadius: fontSize * 0.18,
            }}
          >
            {/* the wash — clipped to a left->right reveal so it paints across the word */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: COLORS.wash,
                opacity: washOpacity,
                borderRadius: fontSize * 0.18,
                clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                boxShadow: isActive
                  ? `0 2px 14px ${hexA(COLORS.indigoBright, 0.28)}`
                  : 'none',
              }}
            />
            <span style={{ position: 'relative' }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};

// --- tiny color helpers (no deps) ---
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function interpolateColor(t: number, from: string, to: string) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * clamp01(t));
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}
function hexA(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
