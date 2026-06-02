import type { ReactNode } from 'react';

/** The app top bar: brand on the left, optional subtitle, optional action slot. */
export function TopBar({
  subtitle,
  right,
}: {
  subtitle?: string | undefined;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold leading-none">ReadAloud</h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] text-ink-soft">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}
