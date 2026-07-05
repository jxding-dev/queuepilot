// Run step: rate preset, sample/full run, and — while a run is active —
// pause/resume/stop. Progress summary + result table replace the Phase 3 list.

import { useState } from 'react';
import { useStore, isRunActive } from '../state/store';
import { PRESET_ORDER } from '../lib/presets';
import { copy } from '../constants/copy';
import { ProgressSummary } from './ProgressSummary';
import { ResultTable } from './ResultTable';
import { ConfirmDialog } from './ConfirmDialog';
import { RetryFailedButton } from './RetryFailedButton';
import { ExportPanel } from './ExportPanel';
import { WarningBanner } from './WarningBanner';

export function RunControls() {
  const csv = useStore((s) => s.csv);
  const run = useStore((s) => s.run);
  const method = useStore((s) => s.config.method);
  const autoPaused429 = useStore((s) => s.autoPaused429);
  const skipSampledSuccess = useStore((s) => s.skipSampledSuccess);
  const setSkipSampledSuccess = useStore((s) => s.setSkipSampledSuccess);
  const setPreset = useStore((s) => s.setPreset);
  const startSample = useStore((s) => s.startSample);
  const startFull = useStore((s) => s.startFull);
  const pauseRun = useStore((s) => s.pauseRun);
  const resumeRun = useStore((s) => s.resumeRun);
  const stopRun = useStore((s) => s.stopRun);

  const [confirmStop, setConfirmStop] = useState(false);

  if (!csv) return null; // gating prevents reaching Run without a CSV

  const total = csv.rows.length;
  const active = isRunActive(run.phase);

  // Counts for the stop-confirm message (how many haven't been sent yet) and
  // for the "N successful rows will be skipped" note.
  let done = 0;
  let successCount = 0;
  for (const r of run.results.values()) {
    if (r.status === 'success' || r.status === 'failed') done++;
    if (r.status === 'success') successCount++;
  }
  const remaining = run.results.size - done;

  const canResume = run.phase === 'paused' || run.phase === 'pausing';

  // Enough completed rows and every one failed the same network/CORS way -> one
  // clear explainer instead of N identical row errors. Kind-based (no string
  // compare) and shown early — in any phase, not just at the end.
  const completed = [...run.results.values()].filter(
    (r) => r.status === 'success' || r.status === 'failed',
  );
  const allCors =
    completed.length >= 5 &&
    completed.every((r) => r.status === 'failed' && r.errorKind === 'network');

  return (
    <section className="panel run">
      <h2 className="panel__title">{copy.run.title}</h2>

      {method === 'DELETE' && !active && (
        <WarningBanner tone="danger" role="alert">
          {copy.run.deleteWarning(total)}
        </WarningBanner>
      )}

      {/* Rate presets — locked while a run is active, but editable while paused
          so the user can lower the speed before resuming (e.g. after 429). */}
      <fieldset className="presets" disabled={active && run.phase !== 'paused'}>
        <legend className="field__label">{copy.run.presetLabel}</legend>
        <div className="presets__options">
          {PRESET_ORDER.map((id) => {
            const p = copy.run.presets[id];
            return (
              <label key={id} className={'preset' + (run.preset === id ? ' preset--active' : '')}>
                <input
                  type="radio"
                  name="preset"
                  value={id}
                  checked={run.preset === id}
                  onChange={() => setPreset(id)}
                />
                <span className="preset__name">{p.name}</span>
                <span className="preset__detail">{p.detail}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {run.preset === 'fast' && (
        <WarningBanner tone="warn">{copy.run.fastWarning}</WarningBanner>
      )}

      {autoPaused429 && (
        <WarningBanner tone="warn">{copy.run.autoPause429}</WarningBanner>
      )}

      {/* Actions */}
      <div className="run__actions">
        {!active && (
          <>
            <button type="button" className="btn btn--secondary" onClick={startSample}>
              {copy.run.sampleButton}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!run.sampleDone}
              title={!run.sampleDone ? copy.run.fullDisabledTooltip : undefined}
              onClick={startFull}
            >
              {copy.run.fullButton(total)}
            </button>
          </>
        )}

        {active && run.phase === 'running' && (
          <button type="button" className="btn btn--secondary" onClick={pauseRun}>
            {copy.run.pauseButton}
          </button>
        )}

        {active && canResume && (
          <button type="button" className="btn btn--primary" onClick={resumeRun}>
            {copy.run.resumeButton}
          </button>
        )}

        {active && run.phase !== 'stopping' && (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmStop(true)}>
            {copy.run.stopButton}
          </button>
        )}
      </div>

      {!active && run.sampleDone && (
        <label className="skip-sampled">
          <input
            type="checkbox"
            checked={skipSampledSuccess}
            onChange={(e) => setSkipSampledSuccess(e.target.checked)}
          />
          {copy.run.skipSampled.label}
        </label>
      )}

      {!active && (
        <p className="run__note">
          {run.sampleDone && skipSampledSuccess
            ? copy.run.skipSampled.noteChecked(successCount)
            : copy.run.reRunNote}
        </p>
      )}

      {/* Progress + results */}
      {run.phase === 'idle' ? (
        <p className="run__empty">{copy.run.noRunYet}</p>
      ) : (
        <>
          <ProgressSummary />
          {allCors && (
            <div className="cors-panel" role="alert">
              <h3 className="cors-panel__title">{copy.run.cors.title}</h3>
              <p className="cors-panel__body">{copy.run.cors.body}</p>
              <p className="cors-panel__hint">{copy.run.cors.hint}</p>
              {run.phase === 'running' && (
                <p className="cors-panel__hint">{copy.run.cors.stopHint}</p>
              )}
            </div>
          )}
          <div className="run__toolbar">
            <RetryFailedButton />
            <ExportPanel />
          </div>
          <ResultTable />
        </>
      )}

      <ConfirmDialog
        open={confirmStop}
        title={copy.run.stopConfirm.title}
        message={copy.run.stopConfirm.message(remaining)}
        confirmLabel={copy.run.stopConfirm.confirm}
        cancelLabel={copy.run.stopConfirm.cancel}
        onConfirm={() => {
          setConfirmStop(false);
          stopRun();
        }}
        onCancel={() => setConfirmStop(false)}
      />
    </section>
  );
}
