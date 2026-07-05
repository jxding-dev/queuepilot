// Reusable inline notice. Tone sets the color; an optional dismiss button turns
// it into a dismissible banner (used for the DELETE warning, the fast-preset
// warning, and the first-visit privacy banner).

import type { ReactNode } from 'react';

interface WarningBannerProps {
  tone?: 'warn' | 'danger' | 'info';
  children: ReactNode;
  role?: 'alert' | 'status';
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function WarningBanner({
  tone = 'warn',
  children,
  role = 'status',
  onDismiss,
  dismissLabel,
}: WarningBannerProps) {
  return (
    <div className={`banner banner--${tone}`} role={role}>
      <div className="banner__body">{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="banner__dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          {dismissLabel}
        </button>
      )}
    </div>
  );
}
