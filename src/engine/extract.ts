// Pull a single value out of a JSON response by dot-path. Plain TypeScript,
// NO React imports. Used to fill the qp_extracted result column.
//
// Path syntax is a plain dot-path: `data.coupon_code`, `items.0.id`. A segment
// made only of digits indexes into an array. This is intentionally NOT JSONPath
// (no wildcards, filters, or multiple matches).
//
// Contract: never throws, for any input.

/**
 * Extract the value at `path` from `jsonText`. Returns undefined when the text
 * isn't valid JSON or the path doesn't resolve. Falsy-but-present values
 * (0, false, '') extract to their string form — presence is decided by key
 * existence, not truthiness.
 */
export function extractByPath(jsonText: string, path: string): string | undefined {
  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch {
    return undefined;
  }

  const segments = path.split('.');
  for (const segment of segments) {
    if (value == null || typeof value !== 'object') return undefined;

    if (Array.isArray(value)) {
      // Only a numeric segment can index an array.
      if (!/^\d+$/.test(segment)) return undefined;
      const index = Number(segment);
      if (index >= value.length) return undefined;
      value = value[index];
      continue;
    }

    // Plain object: presence by key existence (falsy values must survive).
    if (!Object.prototype.hasOwnProperty.call(value, segment)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }

  return formatValue(value);
}

/** Turn a resolved JSON value into a CSV cell string. */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return String(value);
  }
  // object or array -> compact JSON
  return JSON.stringify(value);
}
