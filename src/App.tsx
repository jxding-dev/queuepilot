// Stepper shell. Upload and Build have content; Run / Results render a
// placeholder until later phases. Navigation gating lives in the store.

import { useEffect, useState } from 'react';
import { useStore, isRunActive } from './state/store';
import { STEP_LABELS, copy } from './constants/copy';
import { StepNav } from './components/StepNav';
import { CsvDropzone } from './components/CsvDropzone';
import { CsvPreviewTable } from './components/CsvPreviewTable';
import { RequestBuilder } from './components/RequestBuilder';
import { RunControls } from './components/RunControls';
import { WarningBanner } from './components/WarningBanner';

const PRIVACY_KEY = 'qp_privacy_dismissed';

// First-visit privacy notice. localStorage is used ONLY for this dismissal flag.
function PrivacyBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  return (
    <WarningBanner
      tone="info"
      onDismiss={() => {
        try {
          localStorage.setItem(PRIVACY_KEY, '1');
        } catch {
          /* private mode / storage disabled — just hide it for the session */
        }
        setDismissed(true);
      }}
      dismissLabel={copy.privacy.dismiss}
    >
      {copy.privacy.message}
    </WarningBanner>
  );
}

// Isolated so the frequent run-progress title updates don't re-render the shell.
function DocumentTitle() {
  const step = useStore((s) => s.step);
  const phase = useStore((s) => s.run.phase);
  const results = useStore((s) => s.run.results);
  useEffect(() => {
    if (phase === 'running' || phase === 'pausing' || phase === 'paused' || phase === 'stopping') {
      let done = 0;
      for (const r of results.values()) {
        if (r.status === 'success' || r.status === 'failed') done++;
      }
      const label =
        phase === 'stopping' ? '중지 중' : phase === 'running' ? '실행 중' : '일시정지';
      document.title = `QueuePilot — ${label} ${done.toLocaleString()}/${results.size.toLocaleString()}`;
    } else {
      document.title = `QueuePilot — ${STEP_LABELS[step]}`;
    }
  }, [step, phase, results]);
  return null;
}

function UploadStep() {
  const csv = useStore((s) => s.csv);
  const clearCsv = useStore((s) => s.clearCsv);
  const setStep = useStore((s) => s.setStep);

  if (!csv) {
    return (
      <section className="panel">
        <h2 className="panel__title">{copy.upload.title}</h2>
        <CsvDropzone />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="summary">
        <div>
          <h2 className="panel__title">{csv.fileName}</h2>
          <p className="summary__stats">
            {copy.upload.stats(csv.rows.length, csv.columns.length, csv.warnings.length)}
          </p>
        </div>
        <div className="summary__actions">
          <button type="button" className="btn btn--ghost" onClick={clearCsv}>
            {copy.upload.uploadDifferent}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setStep(1)}>
            {copy.upload.continue}
          </button>
        </div>
      </div>

      {csv.warnings.length > 0 && (
        <div className="warnings" role="status">
          <p className="warnings__title">{copy.upload.warningsTitle(csv.warnings.length)}</p>
          <ul className="warnings__list">
            {csv.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <CsvPreviewTable csv={csv} />
    </section>
  );
}

function PlaceholderStep({ label }: { label: string }) {
  return (
    <section className="panel">
      <div className="placeholder">
        <h2 className="panel__title">{label}</h2>
        <p className="placeholder__text">{copy.placeholder.later}</p>
      </div>
    </section>
  );
}

export default function App() {
  const step = useStore((s) => s.step);
  const runActive = useStore((s) => isRunActive(s.run.phase));

  // Warn before leaving/refreshing while a run is in progress.
  useEffect(() => {
    if (!runActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // required for the browser to show its prompt
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [runActive]);

  return (
    <div className="app">
      <DocumentTitle />
      <PrivacyBanner />
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ▸
          </span>
          <span className="app__name">QueuePilot</span>
        </div>
        <p className="app__tagline">{copy.app.tagline}</p>
      </header>

      <StepNav />

      <main className="app__main">
        {step === 0 && <UploadStep />}
        {step === 1 && <RequestBuilder />}
        {step === 2 && <RunControls />}
        {step === 3 && <PlaceholderStep label={STEP_LABELS[3]} />}
      </main>
    </div>
  );
}
