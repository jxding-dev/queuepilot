// Thin wrappers around PapaParse: parse a File into CsvData, and re-export
// CsvData back to a downloadable CSV (round-trip proof for Phase 1).
//
// Header rules (BLUEPRINT §14):
//   - header row required
//   - trim header whitespace, keep casing
//   - duplicate header  -> suffix _2, _3, ... (e.g. email, email_2)  + warning
//   - empty header      -> column_<position> (1-based)               + warning
//   - everything stays a string (dynamicTyping: false)
//   - skip empty lines; never silently drop data rows (ragged rows are flagged)

import Papa from 'papaparse';
import type { CsvData, CsvRow, RowResult } from '../types';

/** Parse a user-selected CSV file into normalized CsvData. */
export function parseCsvFile(file: File): Promise<CsvData> {
  return new Promise((resolve, reject) => {
    // header:false so we control header de-duplication/renaming ourselves.
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        try {
          resolve(buildCsvData(file.name, results.data, results.errors));
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

export function buildCsvData(
  fileName: string,
  data: string[][],
  parseErrors: Papa.ParseError[],
): CsvData {
  if (!data.length || !data[0]?.length) {
    throw new Error(
      '헤더 행이 없습니다. 첫 번째 행이 컬럼 이름인 CSV 파일이 필요합니다.',
    );
  }

  const warnings: string[] = [];
  const columns = normalizeHeaders(data[0], warnings);

  // Surface non field-mismatch parse errors (e.g. quote problems). Field
  // mismatches are reported per-row below with clearer wording.
  for (const err of parseErrors) {
    if (err.type !== 'FieldMismatch') {
      warnings.push(`파싱 문제: ${err.message}`);
    }
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const cells = data[i];
    const row: CsvRow = {};
    for (let c = 0; c < columns.length; c++) {
      row[columns[c]] = cells[c] ?? '';
    }
    if (cells.length !== columns.length) {
      warnings.push(
        `${i}번째 행: 필드가 ${columns.length}개여야 하는데 ${cells.length}개입니다. 그대로 가져왔습니다.`,
      );
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    warnings.push('헤더는 있지만 데이터 행이 없습니다.');
  }

  return { fileName, columns, rows, warnings };
}

/** Trim, rename empty headers by position, and de-duplicate collisions. */
function normalizeHeaders(rawHeader: string[], warnings: string[]): string[] {
  const assigned = new Set<string>();
  const columns: string[] = [];

  rawHeader.forEach((raw, index) => {
    let base = (raw ?? '').trim();
    const wasEmpty = base === '';
    if (wasEmpty) {
      base = `column_${index + 1}`;
    }

    let name = base;
    if (assigned.has(name)) {
      let n = 2;
      while (assigned.has(`${base}_${n}`)) n++;
      name = `${base}_${n}`;
      warnings.push(`중복된 헤더 "${base}"을(를) "${name}"(으)로 변경했습니다.`);
    } else if (wasEmpty) {
      warnings.push(`${index + 1}번째 컬럼의 빈 헤더를 "${name}"(으)로 변경했습니다.`);
    }

    assigned.add(name);
    columns.push(name);
  });

  return columns;
}

// Result columns appended after the original CSV columns, in this order.
const RESULT_COLUMN_BASES = [
  'qp_status',
  'qp_http_status',
  'qp_error',
  'qp_response',
  'qp_attempts',
] as const;

/**
 * Build a result CSV: every original column (in order) followed by the qp_*
 * result columns. If an original column collides with a qp_ name, the result
 * column is suffixed (qp_status_2). Rows never run export as qp_status=pending
 * with empty result fields. Returns a CSV string (no BOM — the caller adds it).
 */
export function buildResultCsv(
  csv: CsvData,
  results: Map<number, RowResult>,
  failedOnly = false,
): string {
  const taken = new Set(csv.columns);
  const resultColumns = RESULT_COLUMN_BASES.map((base) => {
    let name: string = base;
    if (taken.has(name)) {
      let n = 2;
      while (taken.has(`${base}_${n}`)) n++;
      name = `${base}_${n}`;
    }
    taken.add(name);
    return name;
  });

  const fields = [...csv.columns, ...resultColumns];

  const rowIndexes = csv.rows.map((_, i) => i);
  const included = failedOnly
    ? rowIndexes.filter((i) => results.get(i)?.status === 'failed')
    : rowIndexes;

  const data = included.map((i) => {
    const row = csv.rows[i];
    const original = csv.columns.map((col) => row[col] ?? '');
    return [...original, ...resultCells(results.get(i))];
  });

  return Papa.unparse({ fields, data });
}

/** The five qp_* cell values for one row (undefined result = never run). */
function resultCells(result: RowResult | undefined): string[] {
  if (!result) return ['pending', '', '', '', ''];
  return [
    result.status,
    result.httpStatus != null ? String(result.httpStatus) : '',
    result.errorMessage ?? '',
    result.responseSnippet ?? '',
    result.attempts > 0 ? String(result.attempts) : '',
  ];
}

/** Download a result CSV with a UTF-8 BOM so Excel opens it correctly. */
export function downloadResultCsv(
  csv: CsvData,
  results: Map<number, RowResult>,
  failedOnly = false,
): void {
  const csvString = buildResultCsv(csv, results, failedOnly);
  const base = csv.fileName.replace(/\.csv$/i, '');
  const fileName = failedOnly ? `${base}.failed.csv` : `${base}.results.csv`;

  // Prepend the UTF-8 BOM (﻿) so Excel detects the encoding.
  const blob = new Blob(['﻿' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
