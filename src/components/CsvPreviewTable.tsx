// Renders the first N rows of parsed CSV data. Only a slice is rendered so a
// 10k-row file previews instantly without freezing the tab.

import type { CsvData } from '../types';
import { useCopy } from '../state/store';

const PREVIEW_ROWS = 20;

export function CsvPreviewTable({ csv }: { csv: CsvData }) {
  const copy = useCopy();
  const rows = csv.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="preview">
      <div className="preview__scroll">
        <table className="preview__table">
          <thead>
            <tr>
              <th className="preview__rownum">#</th>
              {csv.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="preview__rownum">{i + 1}</td>
                {csv.columns.map((col) => (
                  <td key={col} title={row[col]}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {csv.rows.length > PREVIEW_ROWS && (
        <p className="preview__more">{copy.upload.previewMore(PREVIEW_ROWS, csv.rows.length)}</p>
      )}
    </div>
  );
}
