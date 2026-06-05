import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type Props = {
  count?: number;
  opacity?: number;
  amplitude?: number; // px
  speed?: number;
  width?: number;
  height?: number;
};

// Smooth gradient "audio ribbons" — the calm waveform the clutter dissolves into.
// Pure sine math (deterministic per frame) so it renders identically every pass.
export const AudioRibbons: React.FC<Props> = ({
  count = 5,
  opacity = 1,
  amplitude = 60,
  speed = 1,
  width = 1920,
  height = 1080,
}) => {
  const frame = useCurrentFrame();
  const t = (frame / 30) * speed;
  const colors = [COLORS.indigo, COLORS.indigoBright, COLORS.violet];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, opacity }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const baseY = height / 2 + (i - (count - 1) / 2) * 90;
        const phase = i * 0.7;
        const amp = amplitude * (1 - Math.abs(i - (count - 1) / 2) / count) + 18;
        const pts: string[] = [];
        for (let x = 0; x <= width; x += 24) {
          const y =
            baseY +
            Math.sin(x / 230 + t * 1.6 + phase) * amp +
            Math.sin(x / 90 - t * 2.3 + phase) * (amp * 0.25);
          pts.push(`${x},${y.toFixed(1)}`);
        }
        const stroke = colors[i % colors.length];
        return (
          <polyline
            key={i}
            points={pts.join(" ")}
            fill="none"
            stroke={stroke}
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.5 + 0.5 * (1 - Math.abs(i - (count - 1) / 2) / count)}
          />
        );
      })}
    </svg>
  );
};
