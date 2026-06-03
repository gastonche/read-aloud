import type { ReactNode } from 'react';
import { ReadAloudMark } from './ReadAloudMark';

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
        <ReadAloudMark className="h-4 w-4" />
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
