// Demo mode: let a visitor experience the whole loop (upload → build → sample →
// full run → failures → retry → export) with zero real network traffic. No React
// imports. The run executor is swapped for a simulator; fetch is never called.
//
// The .invalid TLD (RFC 2606, reserved) is deliberate: if a bug ever bypassed the
// simulator, the request still couldn't reach anything real. Do not change it.

import type { CsvData, CsvRow, RequestTemplate, RowResult } from '../types';
import { classifyHttpStatus, classifyThrownError, type ErrorStrings } from '../engine/errors';
import { extractByPath } from '../engine/extract';

// --- Bundled sample data --------------------------------------------------

// Obviously fake people (@example.com is reserved). Korean names are intentional
// demo content — the allowed exception when scanning for stray UI literals.
const DEMO_NAMES = [
  '홍길동', '김철수', '이영희', '박민수', '최지우',
  '정해인', '강다은', '윤서준', '임하늘', '서지호',
];

function buildDemoCsv(): CsvData {
  const rows: CsvRow[] = [];
  for (let i = 0; i < 30; i++) {
    const userId = 1001 + i;
    rows.push({
      user_id: String(userId),
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      email: `user${userId}@example.com`,
      coupon_amount: String(1000 + (i % 5) * 500),
    });
  }
  return {
    fileName: 'queuepilot-demo.csv',
    columns: ['user_id', 'name', 'email', 'coupon_amount'],
    rows,
    warnings: [],
  };
}

export const DEMO_CSV: CsvData = buildDemoCsv();

export const DEMO_CONFIG: RequestTemplate = {
  method: 'POST',
  urlTemplate: 'https://demo.queuepilot.invalid/coupons/{{user_id}}',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  bodyTemplate: '{\n  "email": "{{email}}",\n  "amount": {{coupon_amount}}\n}',
  extractPath: 'data.coupon_code',
};

// --- Simulated executor ---------------------------------------------------

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 450;

/** Resolve after `ms`, or immediately if `signal` aborts first (never rejects). */
function sleepUnlessAborted(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Build a simulator with the same signature as makeExecuteRow's returned
 * function: `(rowIndex, signal) => Promise<RowResult>`, always resolving.
 *
 * Deterministic by rowIndex: index % 10 === 3 → 500, index % 10 === 7 → 404,
 * otherwise 200. A row that failed once succeeds when re-run, so the "retry
 * failed rows" flow ends as a success story — this is why the executor instance
 * must be kept across runs (the caller memoizes it for the demo session).
 */
export function makeDemoExecuteRow(_rows: CsvRow[], errorStrings: ErrorStrings) {
  const failedOnce = new Set<number>();

  return async function executeDemoRow(
    rowIndex: number,
    signal: AbortSignal,
  ): Promise<RowResult> {
    const latency =
      MIN_LATENCY_MS + Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1));
    await sleepUnlessAborted(latency, signal);

    if (signal.aborted) {
      const aborted = classifyThrownError(null, true, errorStrings);
      return {
        rowIndex,
        status: aborted.status,
        attempts: 1,
        errorMessage: aborted.errorMessage,
        errorKind: aborted.errorKind,
      };
    }

    let httpStatus: number;
    if (failedOnce.has(rowIndex)) httpStatus = 200; // retried row now succeeds
    else if (rowIndex % 10 === 3) httpStatus = 500;
    else if (rowIndex % 10 === 7) httpStatus = 404;
    else httpStatus = 200;

    const outcome = classifyHttpStatus(httpStatus, '', errorStrings);

    if (outcome.status === 'failed') {
      failedOnce.add(rowIndex);
      return {
        rowIndex,
        status: outcome.status,
        attempts: 1,
        httpStatus,
        errorMessage: outcome.errorMessage,
        errorKind: outcome.errorKind,
      };
    }

    const snippet = `{"data":{"coupon_code":"DEMO-${rowIndex}"}}`;
    return {
      rowIndex,
      status: outcome.status,
      attempts: 1,
      httpStatus,
      responseSnippet: snippet,
      extractedValue: extractByPath(snippet, DEMO_CONFIG.extractPath),
    };
  };
}
