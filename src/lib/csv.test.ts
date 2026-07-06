import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { buildResultCsv } from './csv';
import type { CsvData, RowResult } from '../types';

const csv: CsvData = {
  fileName: 'people.csv',
  columns: ['id', 'email'],
  rows: [
    { id: '1', email: 'a@x.com' },
    { id: '2', email: 'b@x.com' },
    { id: '3', email: 'c@x.com' },
  ],
  warnings: [],
};

const results = new Map<number, RowResult>([
  [0, { rowIndex: 0, status: 'success', attempts: 1, httpStatus: 200, responseSnippet: 'ok', extractedValue: 'ABC' }],
  [1, { rowIndex: 1, status: 'failed', attempts: 2, httpStatus: 500, errorMessage: 'boom' }],
  // row 2 intentionally absent -> "never run"
]);

// Parse the produced CSV back into objects for assertions.
function parse(out: string) {
  return Papa.parse(out, { header: true, skipEmptyLines: false }).data as Record<string, string>[];
}

describe('buildResultCsv', () => {
  it('keeps original columns in order, then appends qp_* columns', () => {
    const out = buildResultCsv(csv, results);
    const header = out.split(/\r?\n/)[0];
    expect(header).toBe('id,email,qp_status,qp_http_status,qp_error,qp_response,qp_extracted,qp_attempts');
  });

  it('fills result cells; a never-run row is pending with empty fields', () => {
    const rows = parse(buildResultCsv(csv, results));
    expect(rows[0]).toMatchObject({
      id: '1',
      qp_status: 'success',
      qp_http_status: '200',
      qp_response: 'ok',
      qp_extracted: 'ABC',
      qp_attempts: '1',
    });
    expect(rows[1]).toMatchObject({ qp_status: 'failed', qp_http_status: '500', qp_error: 'boom', qp_extracted: '', qp_attempts: '2' });
    expect(rows[2]).toMatchObject({ id: '3', qp_status: 'pending', qp_http_status: '', qp_error: '', qp_extracted: '', qp_attempts: '' });
  });

  it('suffixes result columns that collide with original qp_ columns', () => {
    const collide: CsvData = {
      ...csv,
      columns: ['id', 'qp_status'],
      rows: [{ id: '1', qp_status: 'original-value' }],
    };
    const out = buildResultCsv(collide, new Map([[0, { rowIndex: 0, status: 'success', attempts: 1 }]]));
    const header = out.split(/\r?\n/)[0];
    expect(header).toBe('id,qp_status,qp_status_2,qp_http_status,qp_error,qp_response,qp_extracted,qp_attempts');
    const rows = parse(out);
    expect(rows[0].qp_status).toBe('original-value'); // original preserved
    expect(rows[0].qp_status_2).toBe('success'); // result went to the suffixed column
  });

  it('suffixes qp_extracted when the original CSV already has that column', () => {
    const collide: CsvData = {
      ...csv,
      columns: ['id', 'qp_extracted'],
      rows: [{ id: '1', qp_extracted: 'original-value' }],
    };
    const out = buildResultCsv(collide, new Map([[0, { rowIndex: 0, status: 'success', attempts: 1, extractedValue: 'X' }]]));
    const header = out.split(/\r?\n/)[0];
    expect(header).toBe('id,qp_extracted,qp_status,qp_http_status,qp_error,qp_response,qp_extracted_2,qp_attempts');
    const rows = parse(out);
    expect(rows[0].qp_extracted).toBe('original-value'); // original preserved
    expect(rows[0].qp_extracted_2).toBe('X'); // extracted value went to the suffixed column
  });

  it('escapes commas, quotes and newlines so the row survives a round-trip', () => {
    const messy: CsvData = {
      fileName: 'm.csv',
      columns: ['note'],
      rows: [{ note: 'a,b "quote"\nsecond line' }],
      warnings: [],
    };
    const res = new Map<number, RowResult>([
      [0, { rowIndex: 0, status: 'failed', attempts: 1, errorMessage: 'msg, with "quote"' }],
    ]);
    const rows = parse(buildResultCsv(messy, res));
    expect(rows[0].note).toBe('a,b "quote"\nsecond line');
    expect(rows[0].qp_error).toBe('msg, with "quote"');
  });

  it('failedOnly includes exactly the failed rows', () => {
    const rows = parse(buildResultCsv(csv, results, true));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('2');
    expect(rows[0].qp_status).toBe('failed');
  });
});
