// ReadAloud brand system — mirrors the landing site so the video reads as first-party.
export const COLORS = {
  indigo: "#4f46e5",
  indigoBright: "#6366f1",
  violet: "#8b5cf6",
  wash: "#eef2ff", // signature highlight wash
  ink: "#1e1b2e", // near-black warm ink for text on light
  inkSoft: "#3b3656",
  paper: "#fbfaff", // warm off-white "page"
  cream: "#fdfcf8",
  // Act I "cold / fatigued" surfaces
  nightTop: "#0e0c1d",
  nightBottom: "#16132b",
  slate: "#4b4860",
} as const;

export const GRADIENT = `linear-gradient(120deg, ${COLORS.indigo} 0%, ${COLORS.indigoBright} 45%, ${COLORS.violet} 100%)`;

export const FONT = {
  // loaded via @remotion/google-fonts in fonts.ts
  display: "Fraunces", // editorial serif — emotional statements + tagline
  body: "Inter", // UI + functional labels
} as const;

// Easing — soft organic everywhere; springy snaps reserved for the controls montage.
export const EASE = {
  // cubic-bezier(.22,1,.36,1) — the brand's calm out-ease
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const FPS = 30;
