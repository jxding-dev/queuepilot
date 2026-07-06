// Result table: row #, first CSV column value (for recognizability), status
// badge, httpStatus, and a truncated error message. Filter All / Failed and
// paginate at 50 rows/page (no virtualization).

import { useState } from 'react';
import { useStore, useCopy } from '../state/store';
import { StatusBadge } from './StatusBadge';

const PAGE_SIZE = 50;
type Filter = 'all' | 'failed';

export function ResultTable() {
  const copy = useCopy();
  const csv = useStore((s) => s.csv);
  const results = useStore((s) => s.run.results);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);

  if (!csv) return null;
  const firstCol = csv.columns[0];

  const all = [...results.values()].sort((a, b) => a.rowIndex - b.rowIndex);
  const failedCount = all.reduce((n, r) => n + (r.status === 'failed' ? 1 : 0), 0);
  const rows = filter === 'failed' ? all.filter((r) => r.status === 'failed') : all;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const selectFilter = (f: Filter) => {
    setFilter(f);
    setPage(0);
  };

  return (
    <div className="rtable">
      <div className="rtable__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={'rtable__tab' + (filter === 'all' ? ' rtable__tab--active' : '')}
          onClick={() => selectFilter('all')}
        >
          {copy.run.filterAll} ({all.length.toLocaleString()})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'failed'}
          className={'rtable__tab' + (filter === 'failed' ? ' rtable__tab--active' : '')}
          onClick={() => selectFilter('failed')}
        >
          {copy.run.filterFailed} ({failedCount.toLocaleString()})
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rtable__empty">
          {filter === 'failed' ? copy.run.noFailedRows : copy.run.tableEmpty}
        </p>
      ) : (
        <>
          <div className="rtable__scroll">
            <table className="rtable__table">
              <thead>
                <tr>
                  <th className="rtable__num">#</th>
                  <th>{firstCol}</th>
                  <th>{copy.run.colStatus}</th>
                  <th>HTTP</th>
                  <th>{copy.run.colError}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const value = csv.rows[r.rowIndex]?.[firstCol] ?? '';
                  return (
                    <tr key={r.rowIndex}>
                      <td className="rtable__num">{r.rowIndex + 1}</td>
                      <td className="rtable__val" title={value}>
                        {value}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="rtable__http">{r.httpStatus ?? ''}</td>
                      <td className="rtable__err" title={r.errorMessage}>
                        {r.errorMessage ?? ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="rtable__pager">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={clampedPage === 0}
                onClick={() => setPage(clampedPage - 1)}
              >
                {copy.run.prevPage}
              </button>
              <span className="rtable__pageinfo">
                {copy.run.pageOf(clampedPage + 1, pageCount)}
              </span>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage(clampedPage + 1)}
              >
                {copy.run.nextPage}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
