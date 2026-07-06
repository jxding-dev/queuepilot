// Single Zustand store. Slices:
//   csv    — the parsed file, parse status, parse error
//   config — the RequestTemplate being built (Phase 2)
//   ui     — the current stepper step
// Run slice is added in a later phase.

import { create, type StoreApi } from 'zustand';
import type { CsvData, HttpMethod, RequestTemplate, RowResult, RunPhase, RunState } from '../types';
import { parseCsvFile } from '../lib/csv';
import { unresolvedTokens } from '../engine/templating';
import { runQueue, createRunControl, makeExecuteRow, type RunHandle } from '../engine/queueRunner';
import { PRESETS, DEFAULT_PRESET, type PresetId } from '../lib/presets';
import { loadConfig, saveConfig, clearConfig } from '../lib/configStorage';

const SAMPLE_SIZE = 5;
const FLUSH_MS = 100;

export const STEPS = ['Upload', 'Build', 'Run'] as const;
export type StepIndex = 0 | 1 | 2;

const DEFAULT_CONFIG: RequestTemplate = {
  method: 'GET',
  urlTemplate: '',
  headers: [{ key: '', value: '' }],
  bodyTemplate: '',
  extractPath: '',
};

// Restore the saved request template + preset (or defaults) at store creation.
const LOADED = loadConfig(DEFAULT_CONFIG, DEFAULT_PRESET);

/** Methods that carry a request body; GET/DELETE hide the body editor. */
export function methodHasBody(method: HttpMethod): boolean {
  return method !== 'GET' && method !== 'DELETE';
}

/** All template strings that take part in the request for the current method. */
export function configTemplateTexts(config: RequestTemplate): string[] {
  const texts = [config.urlTemplate];
  for (const header of config.headers) {
    texts.push(header.key, header.value);
  }
  if (methodHasBody(config.method)) {
    texts.push(config.bodyTemplate);
  }
  return texts;
}

/** Unique {{tokens}} across the whole request that match no CSV column. */
export function configUnresolvedTokens(
  config: RequestTemplate,
  columns: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of configTemplateTexts(config)) {
    for (const token of unresolvedTokens(text, columns)) {
      if (!seen.has(token)) {
        seen.add(token);
        out.push(token);
      }
    }
  }
  return out;
}

/** Build step is done when the URL is set and no tokens are unresolved. */
export function isBuildComplete(config: RequestTemplate, columns: string[]): boolean {
  return (
    config.urlTemplate.trim() !== '' &&
    configUnresolvedTokens(config, columns).length === 0
  );
}

/** A run is "active" (config locked) in any phase between start and finish. */
export function isRunActive(phase: RunPhase): boolean {
  return phase !== 'idle' && phase !== 'done';
}

const INITIAL_RUN: RunState = {
  phase: 'idle',
  mode: 'sample',
  preset: DEFAULT_PRESET,
  results: new Map(),
  sampleDone: false,
};

interface AppState {
  // csv slice
  csv: CsvData | null;
  isParsing: boolean;
  parseError: string | null;

  // config slice
  config: RequestTemplate;
  saveAuthHeaders: boolean; // opt-in to persist auth-like header values

  // run slice
  run: RunState;
  runStartedAt: number | null; // wall-clock start, for the ETA estimate
  runBaselineDone: number; // rows already completed at run start (kept sample successes)
  autoPaused429: boolean; // set when a run auto-pauses after repeated 429s
  skipSampledSuccess: boolean; // skip sample-successful rows on the full run

  // ui slice
  step: number;

  // actions
  parseFile: (file: File) => Promise<void>;
  clearCsv: () => void;
  setStep: (step: number) => void;
  setMethod: (method: HttpMethod) => void;
  setUrlTemplate: (urlTemplate: string) => void;
  setBodyTemplate: (bodyTemplate: string) => void;
  setExtractPath: (extractPath: string) => void;
  addHeader: () => void;
  updateHeader: (index: number, patch: Partial<{ key: string; value: string }>) => void;
  removeHeader: (index: number) => void;
  setSaveAuthHeaders: (value: boolean) => void;
  resetConfig: () => void;
  setPreset: (preset: PresetId) => void;
  setSkipSampledSuccess: (value: boolean) => void;
  startSample: () => void;
  startFull: () => void;
  retryFailed: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
}

// Live run handles, kept outside the store: they are mutable and only one run
// happens at a time. The store holds serializable run state; these drive it.
let activeHandle: RunHandle | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let resultBuffer: RowResult[] = [];
let activeCount = 0; // in-flight requests, for the pausing -> paused transition
let saveTimer: ReturnType<typeof setTimeout> | null = null; // debounced config persistence

export const useStore = create<AppState>((set, get) => ({
  csv: null,
  isParsing: false,
  parseError: null,
  config: LOADED.config,
  saveAuthHeaders: LOADED.saveAuthHeaders,
  run: { ...INITIAL_RUN, preset: LOADED.preset },
  runStartedAt: null,
  runBaselineDone: 0,
  autoPaused429: false,
  skipSampledSuccess: true,
  step: 0,

  parseFile: async (file) => {
    set({ isParsing: true, parseError: null });
    try {
      const csv = await parseCsvFile(file);
      set({ csv, isParsing: false });
    } catch (err) {
      set({
        csv: null,
        isParsing: false,
        parseError:
          err instanceof Error ? err.message : '이 파일을 CSV로 읽을 수 없습니다.',
      });
    }
  },

  clearCsv: () => set({ csv: null, parseError: null, step: 0 }),

  setStep: (step) => {
    const state = get();
    // Gate forward navigation: leave Upload only once a CSV is parsed, and leave
    // Build only once the request template is complete (URL set, no unresolved tokens).
    if (step > 0 && !state.csv) return;
    if (step >= 2 && !(state.csv && isBuildComplete(state.config, state.csv.columns))) {
      return;
    }
    set({ step });
  },

  setMethod: (method) => set((s) => ({ config: { ...s.config, method } })),

  setUrlTemplate: (urlTemplate) => set((s) => ({ config: { ...s.config, urlTemplate } })),

  setBodyTemplate: (bodyTemplate) => set((s) => ({ config: { ...s.config, bodyTemplate } })),

  setExtractPath: (extractPath) => set((s) => ({ config: { ...s.config, extractPath } })),

  addHeader: () =>
    set((s) => ({
      config: { ...s.config, headers: [...s.config.headers, { key: '', value: '' }] },
    })),

  updateHeader: (index, patch) =>
    set((s) => ({
      config: {
        ...s.config,
        headers: s.config.headers.map((h, i) => (i === index ? { ...h, ...patch } : h)),
      },
    })),

  removeHeader: (index) =>
    set((s) => ({
      config: { ...s.config, headers: s.config.headers.filter((_, i) => i !== index) },
    })),

  setSaveAuthHeaders: (value) => {
    set({ saveAuthHeaders: value });
    // Re-persist now so toggling off strips (or on restores) the sensitive
    // values in storage immediately, not only on the next config edit.
    const s = get();
    saveConfig(s.config, s.run.preset, value);
  },

  resetConfig: () => {
    set((s) => ({
      config: DEFAULT_CONFIG,
      saveAuthHeaders: false,
      run: { ...s.run, preset: DEFAULT_PRESET },
    }));
    // The set() above scheduled a debounced save via subscribe; cancel it and
    // delete the stored entry so a reset actually removes persistence.
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    clearConfig();
  },

  setPreset: (preset) => {
    const phase = get().run.phase;
    // Locked mid-run, except while paused (so the user can lower the speed
    // before resuming after a 429 auto-pause).
    if (isRunActive(phase) && phase !== 'paused') return;
    set((s) => ({ run: { ...s.run, preset } }));
  },

  setSkipSampledSuccess: (value) => set({ skipSampledSuccess: value }),

  startSample: () => {
    void beginRun(set, get, 'sample');
  },

  startFull: () => {
    if (!get().run.sampleDone) return; // full run is gated on a completed sample
    void beginRun(set, get, 'full');
  },

  retryFailed: () => {
    void beginRun(set, get, 'retry');
  },

  pauseRun: () => {
    if (get().run.phase !== 'running') return;
    activeHandle?.pause(); // gate closes; in-flight requests finish naturally
    // If nothing is in flight (workers between requests), we're paused immediately.
    set((s) => ({ run: { ...s.run, phase: activeCount === 0 ? 'paused' : 'pausing' } }));
  },

  resumeRun: () => {
    const phase = get().run.phase;
    if (phase !== 'paused' && phase !== 'pausing') return;
    activeHandle?.resume(); // reopens the gate; nothing is re-sent
    set((s) => ({ run: { ...s.run, phase: 'running' }, autoPaused429: false }));
  },

  stopRun: () => {
    if (!isRunActive(get().run.phase)) return;
    activeHandle?.stop(); // aborts in-flight; runQueue resolves -> phase 'done'
    set((s) => ({ run: { ...s.run, phase: 'stopping' }, autoPaused429: false }));
  },
}));

// Auto-save the request template + preset (debounced) whenever they change.
// CSV data and run results are never persisted. The subscribe fires on every
// state change (incl. per-flush run updates), so we compare config/preset refs
// and bail out fast when neither changed.
let prevConfig = useStore.getState().config;
let prevPreset = useStore.getState().run.preset;
useStore.subscribe((state) => {
  if (state.config === prevConfig && state.run.preset === prevPreset) return;
  prevConfig = state.config;
  prevPreset = state.run.preset;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const s = useStore.getState();
    saveConfig(s.config, s.run.preset, s.saveAuthHeaders);
  }, 300);
});

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

/**
 * Drives one run. sample/full seed a fresh pending map over the first N / all
 * rows; retry keeps existing results and resets ONLY the failed rows to pending.
 * Buffered results flush into the store every ~100ms so a fast preset can't
 * thrash React with per-response renders.
 */
async function beginRun(
  set: SetFn,
  get: GetFn,
  mode: 'sample' | 'full' | 'retry',
): Promise<void> {
  const state = get();
  if (!state.csv) return;
  if (isRunActive(state.run.phase)) return; // one run at a time; guards double-clicks

  let rowIndexes: number[];
  let results: Map<number, RowResult>;

  if (mode === 'retry') {
    // Only previously-failed rows; successes and untouched rows stay as they are.
    results = new Map(state.run.results);
    rowIndexes = [];
    for (const [i, r] of state.run.results) {
      if (r.status === 'failed') {
        rowIndexes.push(i);
        // Reset to pending but keep the prior attempts count as the base.
        results.set(i, { rowIndex: i, status: 'pending', attempts: r.attempts });
      }
    }
    rowIndexes.sort((a, b) => a - b);
    if (rowIndexes.length === 0) return;
  } else {
    const total = state.csv.rows.length;
    const count = mode === 'sample' ? Math.min(SAMPLE_SIZE, total) : total;
    const allIndexes = Array.from({ length: count }, (_, i) => i);

    // On a full run, optionally keep rows that already succeeded (in the sample)
    // instead of re-sending them. Failed/pending rows are still (re-)sent.
    const keep =
      mode === 'full' && state.skipSampledSuccess
        ? new Set(
            [...state.run.results.entries()]
              .filter(([, r]) => r.status === 'success')
              .map(([i]) => i),
          )
        : new Set<number>();

    rowIndexes = allIndexes.filter((i) => !keep.has(i));
    results = new Map();
    for (const i of allIndexes) {
      // Copy kept successes unchanged; seed everything else as pending.
      results.set(i, keep.has(i) ? state.run.results.get(i)! : { rowIndex: i, status: 'pending', attempts: 0 });
    }
  }

  // Attempts each target row had before this run; the result's attempts becomes
  // base + 1 (so a retried row that already ran once reports attempts = 2).
  const baseAttempts = new Map<number, number>();
  for (const i of rowIndexes) baseAttempts.set(i, results.get(i)!.attempts);

  // Rows already completed at start (kept sample successes / retry successes) —
  // excluded from the ETA so it reflects only rows processed this run.
  let baselineDone = 0;
  for (const r of results.values()) {
    if (r.status === 'success' || r.status === 'failed') baselineDone++;
  }

  const handle = createRunControl();
  activeHandle = handle;
  resultBuffer = [];
  activeCount = 0;

  set((s) => ({
    run: { ...s.run, phase: 'running', mode, results },
    runStartedAt: Date.now(),
    runBaselineDone: baselineDone,
    autoPaused429: false,
  }));

  const flush = () => {
    if (resultBuffer.length === 0) return;
    const buffered = resultBuffer;
    resultBuffer = [];
    set((s) => {
      const next = new Map(s.run.results);
      for (const r of buffered) next.set(r.rowIndex, r);
      return { run: { ...s.run, results: next } };
    });
  };
  flushTimer = setInterval(flush, FLUSH_MS);

  const { concurrency, delayMs } = PRESETS[state.run.preset];
  const rawExecute = makeExecuteRow(state.config, state.csv.rows);

  // Track in-flight requests so "Pausing…" can flip to "Paused" once the last
  // active request settles (in-flight requests finish naturally on pause).
  const execute = async (rowIndex: number, signal: AbortSignal): Promise<RowResult> => {
    activeCount++;
    try {
      return await rawExecute(rowIndex, signal);
    } finally {
      activeCount--;
      if (activeCount === 0 && get().run.phase === 'pausing') {
        set((s) => ({ run: { ...s.run, phase: 'paused' } }));
      }
    }
  };

  // Auto-pause the run after 3 accumulated 429s (per run; a local resets it).
  let rate429Count = 0;

  try {
    await runQueue(rowIndexes, execute, { concurrency, delayMs }, handle.control, (r) => {
      // Stamp the real attempt number (executor always reports 1).
      r.attempts = (baseAttempts.get(r.rowIndex) ?? 0) + 1;
      resultBuffer.push(r);

      // Count 429s here (at result time, not flush time) so the pause is immediate.
      if (r.errorKind === 'http_429') rate429Count++;
      if (rate429Count >= 3 && get().run.phase === 'running') {
        rate429Count = 0; // reset so resuming needs 3 more 429s before re-pausing
        handle.pause(); // gate closes; in-flight requests finish naturally
        set((s) => ({
          run: { ...s.run, phase: activeCount === 0 ? 'paused' : 'pausing' },
          autoPaused429: true,
        }));
      }
    });
  } finally {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flush(); // write any tail results (including aborted in-flight rows)
    const stopped = handle.control.stopped;
    activeHandle = null;
    set((s) => ({
      run: {
        ...s.run,
        phase: 'done',
        sampleDone: s.run.sampleDone || (mode === 'sample' && !stopped),
      },
    }));
  }
}
