// Maps every request outcome to a { status, errorMessage, errorKind } triple.
// Pure and React-free. The human-readable strings are INJECTED (see ErrorStrings)
// so the message is recorded in whatever locale was active at execution time;
// the errorKind is locale-independent.

import type { ErrorKind, RowStatus } from '../types';

/** The localized strings the classifiers need. Mirrors a dictionary's run.errors. */
export interface ErrorStrings {
  clientError: (status: number, statusText: string) => string;
  tooManyRequests: string;
  serverError: (status: number) => string;
  timeout: string;
  network: string;
  aborted: string;
  unexpectedStatus: (status: number) => string;
  unexpected: string;
}

export interface Outcome {
  status: RowStatus;
  errorMessage?: string;
  errorKind?: ErrorKind;
}

/** Classify a completed HTTP response by its status code. */
export function classifyHttpStatus(
  status: number,
  statusText: string,
  s: ErrorStrings,
): Outcome {
  if (status >= 200 && status < 300) return { status: 'success' };
  if (status === 429) {
    return { status: 'failed', errorMessage: s.tooManyRequests, errorKind: 'http_429' };
  }
  if (status >= 400 && status < 500) {
    return { status: 'failed', errorMessage: s.clientError(status, statusText), errorKind: 'http_4xx' };
  }
  if (status >= 500) {
    return { status: 'failed', errorMessage: s.serverError(status), errorKind: 'http_5xx' };
  }
  // 1xx / 3xx are unexpected for a completed fetch (redirects are followed).
  return { status: 'failed', errorMessage: s.unexpectedStatus(status), errorKind: 'unexpected_status' };
}

/**
 * Classify an error thrown by fetch (or body read). `runAborted` is true when the
 * user's run-level AbortController fired (emergency stop) — that takes precedence
 * over a timeout so a deliberate stop reads as a stop, not a 30s timeout.
 */
export function classifyThrownError(
  err: unknown,
  runAborted: boolean,
  s: ErrorStrings,
): Outcome {
  if (runAborted) return { status: 'failed', errorMessage: s.aborted, errorKind: 'aborted' };
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return { status: 'failed', errorMessage: s.timeout, errorKind: 'timeout' };
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { status: 'failed', errorMessage: s.aborted, errorKind: 'aborted' };
  }
  // fetch throws a TypeError for network failures and CORS blocks — the two are
  // indistinguishable from the browser, so the message names both honestly.
  if (err instanceof TypeError) return { status: 'failed', errorMessage: s.network, errorKind: 'network' };
  return { status: 'failed', errorMessage: s.unexpected, errorKind: 'unexpected' };
}
