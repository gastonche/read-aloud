import React from "react";
import { GRADIENT } from "../theme";

// A calm gradient silhouette — head + shoulders leaning back, earbud + soft
// listening rings. Stylized, brand-gradient filled. `listen` (0..1) pulses the rings.
export const PersonSilhouette: React.FC<{ listen: number }> = ({ listen }) => {
  return (
    <svg width={520} height={620} viewBox="0 0 520 620">
      <defs>
        <linearGradient id="figure" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* listening rings emanating from the ear */}
      {[0, 1, 2].map((i) => {
        const p = (listen + i / 3) % 1;
        return (
          <circle
            key={i}
            cx={350}
            cy={210}
            r={20 + p * 120}
            fill="none"
            stroke="url(#figure)"
            strokeWidth={3}
            opacity={(1 - p) * 0.5}
          />
        );
      })}

      {/* head (tilted back slightly) */}
      <circle cx={300} cy={190} r={92} fill="url(#figure)" />
      {/* shoulders / torso */}
      <path
        d="M120 620 C120 430 200 330 300 330 C400 330 480 430 480 620 Z"
        fill="url(#figure)"
      />
      {/* earbud */}
      <circle cx={356} cy={214} r={12} fill="white" opacity={0.9} />
    </svg>
  );
};
