// Brand system — mirrors the landing site so the video reads as first-party.
export const COLORS = {
  indigo: '#4f46e5',
  indigoBright: '#6366f1',
  violet: '#8b5cf6',
  wash: '#eef2ff',
  ink: '#1e1b2e',
  inkSoft: '#3b3656',
  paper: '#fbfaff',
  cream: '#fdfcf8',
  // Act I "cold / fatigued" surfaces
  nightTop: '#0e0c1d',
  nightBottom: '#16132b',
  slate: '#4b4860',
} as const;

export const GRADIENT = `linear-gradient(120deg, ${COLORS.indigo} 0%, ${COLORS.indigoBright} 45%, ${COLORS.violet} 100%)`;

export const FONT = {
  display: 'Fraunces',
  body: 'Inter',
} as const;

export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const FPS = 30;
