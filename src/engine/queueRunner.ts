// The execution engine. Plain TypeScript, NO React imports.
//
// Two parts:
//   1. runQueue + createRunControl — a generic promise pool with a shared cursor,
//      a pause gate, and a stop flag (pause/resume UI ships in Phase 4, but the
//      engine is designed around them now).
//   2. makeExecuteRow — builds one HTTP request from the template and a CSV row,
//      fetches with a 30s timeout merged into the run signal, and ALWAYS resolves
//      to a RowResult (never throws).

import type { CsvRow, RequestTemplate, RowResult } from '../types';
import { substitute, substituteUrl } from './templating';
import { classifyHttpStatus, classifyThrownError, type ErrorStrings } from './errors';
import { extractByPath } from './extract';

// ---------------------------------------------------------------------------
// Run control: stop flag + pause gate + abort signal
// ---------------------------------------------------------------------------

/** The subset of control the pool reads. */
export interface RunControl {
  readonly stopped: boolean;
  whenNotPaused(): Promise<void>;
  readonly signal: AbortSignal;
}

/** The full handle the caller (store) uses to drive a run. */
export interface RunHandle {
  control: RunControl;
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  stop(): void;
}

export function createRunControl(): RunHandle {
  const abortController = new AbortController();
  let paused = false;
  let stopped = false;
  // A resolved promise means "not paused"; a pending one parks workers.
  let gate: Promise<void> = Promise.resolve();
  let openGate: (() => void) | null = null;

  const control: RunControl = {
    get stopped() {
      return stopped;
    },
    get signal() {
      return abortController.signal;
    },
    whenNotPaused() {
      return gate;
    },
  };

  return {
    control,
    get paused() {
      return paused;
    },
    pause() {
      if (paused || stopped) return;
      paused = true;
      gate = new Promise<void>((resolve) => {
        openGate = resolve;
      });
    },
    resume() {
      if (!paused) return;
      paused = false;
      openGate?.();
      openGate = null;
      gate = Promise.resolve();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      // Release any parked workers so they can observe `stopped` and exit.
      openGate?.();
      openGate = null;
      gate = Promise.resolve();
      abortController.abort();
    },
  };
}

// ---------------------------------------------------------------------------
// The pool
// ---------------------------------------------------------------------------

export interface RunQueueOptions {
  concurrency: number;
  delayMs: number;
}

/**
 * Run `execute` over `rowIndexes` with at most `concurrency` in flight. Workers
 * share a cursor; JS's single thread makes `cursor++` race-free. `execute` is
 * expected never to throw (it resolves to a RowResult, error or not).
 */
export async function runQueue(
  rowIndexes: number[],
  execute: (rowIndex: number, signal: AbortSignal) => Promise<RowResult>,
  options: RunQueueOptions,
  control: RunControl,
  onResult: (result: RowResult) => void,
): Promise<void> {
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(options.concurrency, rowIndexes.length || 1));

  async function worker(): Promise<void> {
    while (true) {
      if (control.stopped) return;
      await control.whenNotPaused();
      if (control.stopped) return; // re-check: a stop may have arrived while parked
      const i = cursor++;
      if (i >= rowIndexes.length) return;
      const result = await execute(rowIndexes[i], control.signal);
      onResult(result);
      if (options.delayMs > 0 && !control.stopped) {
        await sleep(options.delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Request executor
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 30_000;
const SNIPPET_CHARS = 500;

/**
 * Returns an `execute(rowIndex, signal)` bound to a template + rows. Every call
 * resolves to a RowResult; failures are caught and classified (never thrown).
 */
export function makeExecuteRow(config: RequestTemplate, rows: CsvRow[], errorStrings: ErrorStrings) {
  const hasBody = config.method !== 'GET' && config.method !== 'DELETE';

  return async function executeRow(
    rowIndex: number,
    runSignal: AbortSignal,
  ): Promise<RowResult> {
    const row = rows[rowIndex];
    const url = substituteUrl(config.urlTemplate, row);

    const headers = new Headers();
    for (const header of config.headers) {
      const key = substitute(header.key, row).trim();
      if (key === '') continue;
      headers.set(key, substitute(header.value, row));
    }

    const body = hasBody ? substitute(config.bodyTemplate, row, { jsonEscape: true }) : undefined;

    // Merge the 30s per-request timeout with the run-wide stop signal.
    const signal = AbortSignal.any([runSignal, AbortSignal.timeout(TIMEOUT_MS)]);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: body && body.length > 0 ? body : undefined,
        signal,
        redirect: 'follow',
      });

      // Read the FULL body first: extraction must see values beyond the snippet
      // cutoff, so extract before truncating. Runs on success and error bodies.
      const fullText = await safeReadText(response);
      const extractPath = config.extractPath.trim();
      const extractedValue = extractPath
        ? extractByPath(fullText, extractPath)
        : undefined;
      const snippet = fullText.slice(0, SNIPPET_CHARS);
      const outcome = classifyHttpStatus(response.status, response.statusText, errorStrings);

      return {
        rowIndex,
        status: outcome.status,
        attempts: 1,
        httpStatus: response.status,
        errorMessage: outcome.errorMessage,
        errorKind: outcome.errorKind,
        responseSnippet: snippet,
        extractedValue,
      };
    } catch (err) {
      const outcome = classifyThrownError(err, runSignal.aborted, errorStrings);
      return {
        rowIndex,
        status: outcome.status,
        attempts: 1,
        errorMessage: outcome.errorMessage,
        errorKind: outcome.errorKind,
      };
    }
  };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
