// Core domain types for QueuePilot.
// Phase 1 only uses CsvRow / CsvData. The rest are defined now because later
// phases (request builder, queue engine, results) depend on these exact shapes.

export type CsvRow = Record<string, string>;

export interface CsvData {
  fileName: string;
  columns: string[];
  rows: CsvRow[];
  warnings: string[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestTemplate {
  method: HttpMethod;
  urlTemplate: string;
  headers: { key: string; value: string }[];
  bodyTemplate: string;
}

export type RowStatus = 'pending' | 'running' | 'success' | 'failed';

export interface RowResult {
  rowIndex: number;
  status: RowStatus;
  attempts: number;
  httpStatus?: number;
  errorMessage?: string;
  responseSnippet?: string;
}

export type RunPhase = 'idle' | 'running' | 'pausing' | 'paused' | 'stopping' | 'done';

export interface RunState {
  phase: RunPhase;
  mode: 'sample' | 'full' | 'retry';
  preset: 'safe' | 'balanced' | 'fast';
  results: Map<number, RowResult>;
  sampleDone: boolean;
}
