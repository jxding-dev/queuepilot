// Sticky run summary: phase text, progress bar, "done / total", live success /
// failed / pending counts, and a rough ETA from average wall-clock per row.

import { useStore } from '../state/store';
import { copy } from '../constants/copy';
import type { RunState } from '../types';

export function ProgressSummary() {
  const run = useStore((s) => s.run);
  const startedAt = useStore((s) => s.runStartedAt);

  let success = 0;
  let failed = 0;
  for (const r of run.results.values()) {
    if (r.status === 'success') success++;
    else if (r.status === 'failed') failed++;
  }
  const total = run.results.size;
  const done = success + failed;
  const pending = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // Announce only at 25/50/75/100 milestones. The aria-live region re-announces
  // when its text changes, and this text only changes when a milestone is crossed.
  const milestone = [100, 75, 50, 25].find((m) => percent >= m) ?? 0;

  // Rough estimate: wall-clock per completed row × remaining rows. Wall-clock
  // already reflects concurrency, so no need to divide by it.
  let etaText: string | null = null;
  if (run.phase === 'running' && startedAt && done > 0 && pending > 0) {
    const perRow = (Date.now() - startedAt) / done;
    etaText = copy.run.eta(formatDuration(perRow * pending));
  }

  return (
    <div className="progress">
      <div className="progress__top">
        <span className="progress__phase">{phaseLabel(run, done)}</span>
        <span className="progress__count">{copy.run.progress(done, total)}</span>
      </div>

      <div className="progress__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="progress__stats">
        <span className="progress__stat progress__stat--success">✓ {success.toLocaleString()}</span>
        <span className="progress__stat progress__stat--failed">✕ {failed.toLocaleString()}</span>
        <span className="progress__stat">
          {copy.run.statusLabel.pending} {pending.toLocaleString()}
        </span>
        {etaText && <span className="progress__eta">{etaText}</span>}
      </div>

      <div className="sr-only" aria-live="polite">
        {milestone > 0 ? copy.run.announce(milestone) : ''}
      </div>
    </div>
  );
}

function phaseLabel(run: RunState, done: number): string {
  switch (run.phase) {
    case 'running':
      return copy.run.runningLabel;
    case 'pausing':
      return copy.run.pausingLabel;
    case 'paused':
      return copy.run.pausedLabel(done);
    case 'stopping':
      return copy.run.stoppingLabel;
    case 'done':
      return copy.run.doneLabel;
    default:
      return '';
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return copy.run.etaSeconds(seconds);
  return copy.run.etaMinutes(Math.ceil(seconds / 60));
}
