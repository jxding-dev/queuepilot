// Download the results as a CSV: original columns + qp_* result columns. Shown
// whenever any results exist (including after a stopped run).

import { useStore, useCopy } from '../state/store';
import { downloadResultCsv } from '../lib/csv';

export function ExportPanel() {
  const copy = useCopy();
  const csv = useStore((s) => s.csv);
  const results = useStore((s) => s.run.results);

  if (!csv || results.size === 0) return null;

  const hasFailed = [...results.values()].some((r) => r.status === 'failed');

  return (
    <div className="export">
      <span className="export__title">{copy.run.exportTitle}</span>
      <div className="export__buttons">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => downloadResultCsv(csv, results, false)}
        >
          {copy.run.exportAll}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={!hasFailed}
          onClick={() => downloadResultCsv(csv, results, true)}
        >
          {copy.run.exportFailed}
        </button>
      </div>
    </div>
  );
}
