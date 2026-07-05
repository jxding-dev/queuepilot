// Maps every request outcome to a { status, errorMessage } pair. Pure and
// React-free. The human-readable strings live in constants/copy.ts (Korean UI),
// keeping technical tokens — status codes, "CORS", "429", "30초" — intact.

import type { RowStatus } from '../types';
import { copy } from '../constants/copy';

export interface Outcome {
  status: RowStatus;
  errorMessage?: string;
}

const e = copy.run.errors;

/** Classify a completed HTTP response by its status code. */
export function classifyHttpStatus(status: number, statusText: string): Outcome {
  if (status >= 200 && status < 300) return { status: 'success' };
  if (status === 429) return { status: 'failed', errorMessage: e.tooManyRequests };
  if (status >= 400 && status < 500) {
    return { status: 'failed', errorMessage: e.clientError(status, statusText) };
  }
  if (status >= 500) return { status: 'failed', errorMessage: e.serverError(status) };
  // 1xx / 3xx are unexpected for a completed fetch (redirects are followed).
  return { status: 'failed', errorMessage: e.unexpectedStatus(status) };
}

/**
 * Classify an error thrown by fetch (or body read). `runAborted` is true when the
 * user's run-level AbortController fired (emergency stop) — that takes precedence
 * over a timeout so a deliberate stop reads as a stop, not a 30s timeout.
 */
export function classifyThrownError(err: unknown, runAborted: boolean): Outcome {
  if (runAborted) return { status: 'failed', errorMessage: e.aborted };
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return { status: 'failed', errorMessage: e.timeout };
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { status: 'failed', errorMessage: e.aborted };
  }
  // fetch throws a TypeError for network failures and CORS blocks — the two are
  // indistinguishable from the browser, so the message names both honestly.
  if (err instanceof TypeError) return { status: 'failed', errorMessage: e.network };
  return { status: 'failed', errorMessage: e.unexpected };
}
