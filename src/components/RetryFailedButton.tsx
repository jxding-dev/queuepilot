// Retry only the failed rows. Visible when a run is done and something failed.
// For mutating methods (POST/PUT/PATCH), if any failed row timed out or was
// aborted, a confirm dialog warns about possible duplicates before retrying.

import { useState } from 'react';
import { useStore, useCopy } from '../state/store';
import { ConfirmDialog } from './ConfirmDialog';

const MUTATING = new Set(['POST', 'PUT', 'PATCH']);

export function RetryFailedButton() {
  const copy = useCopy();
  const run = useStore((s) => s.run);
  const method = useStore((s) => s.config.method);
  const retryFailed = useStore((s) => s.retryFailed);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (run.phase !== 'done') return null;

  const failed = [...run.results.values()].filter((r) => r.status === 'failed');
  if (failed.length === 0) return null;

  // Duplicate risk only for mutating methods where a failure might have reached
  // the server. Uses the locale-independent errorKind (not a string compare) so
  // it stays correct regardless of the locale a result was recorded in.
  const riskyFailure = failed.some(
    (r) => r.errorKind === 'timeout' || r.errorKind === 'aborted',
  );
  const showDupWarning = MUTATING.has(method) && riskyFailure;

  const onClick = () => {
    if (showDupWarning) setConfirmOpen(true);
    else retryFailed();
  };

  const message = showDupWarning
    ? `${copy.run.retryConfirm.message(failed.length)} ${copy.run.retryConfirm.dupWarning}`
    : copy.run.retryConfirm.message(failed.length);

  return (
    <div className="retry">
      <button type="button" className="btn btn--primary" onClick={onClick}>
        {copy.run.retryButton(failed.length)}
      </button>
      <span className="retry__subtext">{copy.run.retrySubtext}</span>

      <ConfirmDialog
        open={confirmOpen}
        title={copy.run.retryConfirm.title}
        message={message}
        confirmLabel={copy.run.retryConfirm.confirm}
        cancelLabel={copy.run.retryConfirm.cancel}
        onConfirm={() => {
          setConfirmOpen(false);
          retryFailed();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
