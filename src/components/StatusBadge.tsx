// Status pill with a per-status icon so status is legible without relying on
// color alone. pending gray · running blue · success green · failed red.

import type { RowStatus } from '../types';
import { useCopy } from '../state/store';

const ICON: Record<RowStatus, string> = {
  pending: '○',
  running: '◐',
  success: '✓',
  failed: '✕',
};

export function StatusBadge({ status }: { status: RowStatus }) {
  const copy = useCopy();
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__icon" aria-hidden="true">
        {ICON[status]}
      </span>
      {copy.run.statusLabel[status] ?? status}
    </span>
  );
}
