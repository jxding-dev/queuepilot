// Horizontal 3-step stepper. Buttons mirror the store's forward gating so a
// step you can't reach also looks unreachable:
//   Upload       — always
//   Build        — after a CSV is parsed
//   Run          — after the request template is complete (URL + no unresolved tokens)

import { STEPS, useStore, isBuildComplete } from '../state/store';
import { STEP_LABELS } from '../constants/copy';

export function StepNav() {
  const step = useStore((s) => s.step);
  const csv = useStore((s) => s.csv);
  const config = useStore((s) => s.config);
  const setStep = useStore((s) => s.setStep);

  const hasCsv = csv !== null;
  const buildDone = hasCsv && isBuildComplete(config, csv.columns);

  return (
    <nav className="stepnav" aria-label="Progress">
      <ol className="stepnav__list">
        {STEPS.map((key, index) => {
          const isCurrent = index === step;
          const isEnabled = index === 0 || (index === 1 ? hasCsv : buildDone);
          const isComplete =
            index === 0 ? hasCsv : index === 1 ? buildDone : false;

          return (
            <li key={key} className="stepnav__item">
              <button
                type="button"
                className={
                  'stepnav__step' +
                  (isCurrent ? ' stepnav__step--current' : '') +
                  (isComplete ? ' stepnav__step--complete' : '')
                }
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!isEnabled}
                onClick={() => setStep(index)}
              >
                <span className="stepnav__num">{isComplete ? '✓' : index + 1}</span>
                <span className="stepnav__label">{STEP_LABELS[index]}</span>
              </button>
              {index < STEPS.length - 1 && <span className="stepnav__sep" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
