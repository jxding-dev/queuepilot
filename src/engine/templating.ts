// Pure {{token}} templating for request templates.
// No React and no DOM imports — this file is unit-testable in isolation.
//
// A token is written {{column}} where `column` is a CSV column name.
// Whitespace inside the braces is ignored, so {{ email }} === {{email}}.
// Token matching against columns is case-sensitive (BLUEPRINT §14).

import type { CsvRow } from '../types';

// [^{}] keeps a token from swallowing adjacent braces; +? is non-greedy so
// "{{a}}{{b}}" yields two tokens, not one.
const TOKEN_PATTERN = '\\{\\{\\s*([^{}]+?)\\s*\\}\\}';

// A fresh RegExp per call avoids shared lastIndex state between matchAll/replace.
function tokenRegex(): RegExp {
  return new RegExp(TOKEN_PATTERN, 'g');
}

/** Unique token names found in `text`, in first-appearance order. */
export function extractTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(tokenRegex())) {
    const token = match[1].trim();
    if (!seen.has(token)) {
      seen.add(token);
      out.push(token);
    }
  }
  return out;
}

export interface SubstituteOptions {
  /**
   * When true, each substituted value is JSON-string-escaped: we run the value
   * through JSON.stringify and drop the surrounding quotes, keeping the escaped
   * interior. The template author writes the quotes, e.g. "email": "{{email}}",
   * so a cell containing " \ or a newline can no longer break the JSON string.
   *
   * For a value placed as a raw literal (e.g. "count": {{count}} with count=42),
   * escaping a plain number is a no-op, so the value is inserted verbatim.
   */
  jsonEscape?: boolean;
  /**
   * When true, each substituted value is percent-encoded (encodeURIComponent)
   * so a cell containing space, &, #, + or ? can't break the URL or inject
   * extra query parameters.
   */
  urlEncode?: boolean;
}

/** Replace every {{token}} in `text` with the matching cell value from `row`. */
export function substitute(
  text: string,
  row: CsvRow,
  options: SubstituteOptions = {},
): string {
  return text.replace(tokenRegex(), (_full, rawToken: string) => {
    const token = rawToken.trim();
    const value = row[token] ?? ''; // unknown/empty column -> empty string
    if (options.jsonEscape) return escapeForJsonString(value);
    if (options.urlEncode) return encodeURIComponent(value);
    return value;
  });
}

// A template that is exactly one token, e.g. "{{url}}" (whitespace allowed).
const WHOLE_TOKEN_PATTERN = new RegExp(`^\\s*${TOKEN_PATTERN}\\s*$`);

/**
 * Substitute a URL template. Values are percent-encoded so a cell containing
 * space, &, # or + can't break the URL or inject query parameters — EXCEPT
 * when the whole template is a single token (e.g. "{{url}}"): that means "the
 * cell IS the URL", and encoding it would destroy the scheme and slashes.
 */
export function substituteUrl(template: string, row: CsvRow): string {
  if (WHOLE_TOKEN_PATTERN.test(template)) {
    return substitute(template, row);
  }
  return substitute(template, row, { urlEncode: true });
}

/** Tokens used in `template` that do not match any CSV column (case-sensitive). */
export function unresolvedTokens(template: string, columns: string[]): string[] {
  const known = new Set(columns);
  return extractTokens(template).filter((token) => !known.has(token));
}

// JSON.stringify wraps the value in quotes and escapes ", \, newlines, tabs and
// control chars; slicing off the outer quotes leaves a safe JSON string body.
function escapeForJsonString(value: string): string {
  const quoted = JSON.stringify(value);
  return quoted.slice(1, -1);
}
