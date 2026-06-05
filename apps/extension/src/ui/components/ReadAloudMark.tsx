// Glyph only (no background); inherits `currentColor`, so set colour on the parent.
export function ReadAloudMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="22" y="35" width="28" height="9" rx="4.5" fill="currentColor" />
      <rect x="22" y="49" width="20" height="9" rx="4.5" fill="currentColor" />
      <rect x="22" y="63" width="28" height="9" rx="4.5" fill="currentColor" />
      <path
        d="M60 39a15 15 0 0 1 0 22"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M71 31a30 30 0 0 1 0 38"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
