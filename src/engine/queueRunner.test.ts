import { describe, it, expect } from 'vitest';
import { runQueue, createRunControl, type RunControl } from './queueRunner';
import type { RowResult } from '../types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (rowIndex: number): RowResult => ({ rowIndex, status: 'success', attempts: 1 });

describe('runQueue', () => {
  it('never exceeds concurrency and processes each row exactly once', async () => {
    const rowIndexes = Array.from({ length: 60 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;
    const processed: number[] = [];
    const handle = createRunControl();

    const execute = async (rowIndex: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await sleep(3);
      active--;
      processed.push(rowIndex);
      return ok(rowIndex);
    };

    await runQueue(rowIndexes, execute, { concurrency: 4, delayMs: 0 }, handle.control, () => {});

    expect(maxActive).toBeLessThanOrEqual(4);
    expect(maxActive).toBeGreaterThan(1); // actually parallelized
    expect(processed.slice().sort((a, b) => a - b)).toEqual(rowIndexes);
    expect(new Set(processed).size).toBe(rowIndexes.length);
  });

  it('emits one onResult per row', async () => {
    const rowIndexes = [0, 1, 2, 3, 4];
    const results: RowResult[] = [];
    const handle = createRunControl();
    await runQueue(rowIndexes, async (i) => ok(i), { concurrency: 2, delayMs: 0 }, handle.control, (r) =>
      results.push(r),
    );
    expect(results.map((r) => r.rowIndex).sort((a, b) => a - b)).toEqual(rowIndexes);
  });

  it('stop halts new work', async () => {
    const rowIndexes = Array.from({ length: 100 }, (_, i) => i);
    const processed: number[] = [];
    const handle = createRunControl();

    const execute = async (rowIndex: number) => {
      processed.push(rowIndex);
      if (processed.length === 5) handle.stop();
      await sleep(1);
      return ok(rowIndex);
    };

    await runQueue(rowIndexes, execute, { concurrency: 1, delayMs: 0 }, handle.control, () => {});

    expect(processed.length).toBeGreaterThanOrEqual(5);
    expect(processed.length).toBeLessThan(100);
  });

  it('stop aborts the run signal', async () => {
    const handle = createRunControl();
    expect(handle.control.signal.aborted).toBe(false);
    handle.stop();
    expect(handle.control.signal.aborted).toBe(true);
    expect(handle.control.stopped).toBe(true);
  });

  it('pause gate holds workers until resume', async () => {
    const rowIndexes = Array.from({ length: 10 }, (_, i) => i);
    const processed: number[] = [];
    const handle = createRunControl();

    const execute = async (rowIndex: number) => {
      processed.push(rowIndex);
      await sleep(1);
      return ok(rowIndex);
    };

    handle.pause();
    const done = runQueue(
      rowIndexes,
      execute,
      { concurrency: 2, delayMs: 0 },
      handle.control,
      () => {},
    );

    await sleep(20);
    expect(processed.length).toBe(0); // gate holds all workers

    handle.resume();
    await done;
    expect(processed.length).toBe(10); // everything runs after resume
  });

  it('handles an empty row list without hanging', async () => {
    const handle = createRunControl();
    let called = false;
    await runQueue([], async (i) => ok(i), { concurrency: 3, delayMs: 0 }, handle.control, () => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it('respects a stopped control that is passed in already stopped', async () => {
    const control: RunControl = {
      stopped: true,
      whenNotPaused: () => Promise.resolve(),
      signal: new AbortController().signal,
    };
    const processed: number[] = [];
    await runQueue([0, 1, 2], async (i) => ok(i), { concurrency: 2, delayMs: 0 }, control, (r) =>
      processed.push(r.rowIndex),
    );
    expect(processed.length).toBe(0);
  });
});
