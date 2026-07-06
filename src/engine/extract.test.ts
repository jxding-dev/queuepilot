import { describe, it, expect } from 'vitest';
import { extractByPath } from './extract';

describe('extractByPath', () => {
  it('reads a nested object path', () => {
    expect(extractByPath('{"data":{"coupon_code":"ABC"}}', 'data.coupon_code')).toBe('ABC');
  });

  it('indexes into arrays with numeric segments', () => {
    expect(extractByPath('{"items":[{"id":"a"},{"id":"b"}]}', 'items.1.id')).toBe('b');
  });

  it('stringifies numbers and booleans', () => {
    expect(extractByPath('{"n":42}', 'n')).toBe('42');
    expect(extractByPath('{"ok":true}', 'ok')).toBe('true');
  });

  it('extracts falsy-but-present values (0, false, empty string)', () => {
    expect(extractByPath('{"n":0}', 'n')).toBe('0');
    expect(extractByPath('{"ok":false}', 'ok')).toBe('false');
    expect(extractByPath('{"s":""}', 's')).toBe('');
  });

  it('renders null as the string "null"', () => {
    expect(extractByPath('{"v":null}', 'v')).toBe('null');
  });

  it('JSON-stringifies objects and arrays', () => {
    expect(extractByPath('{"o":{"a":1}}', 'o')).toBe('{"a":1}');
    expect(extractByPath('{"a":[1,2]}', 'a')).toBe('[1,2]');
  });

  it('returns undefined for a missing path', () => {
    expect(extractByPath('{"data":{"code":"X"}}', 'data.other')).toBeUndefined();
    expect(extractByPath('{"data":{"code":"X"}}', 'nope.deep.path')).toBeUndefined();
  });

  it('returns undefined when a segment descends into a non-object', () => {
    expect(extractByPath('{"a":"str"}', 'a.b')).toBeUndefined();
  });

  it('returns undefined for an out-of-range array index', () => {
    expect(extractByPath('{"items":[{"id":"a"}]}', 'items.5.id')).toBeUndefined();
  });

  it('returns undefined for a non-numeric segment on an array', () => {
    expect(extractByPath('{"items":[1,2]}', 'items.id')).toBeUndefined();
  });

  it('never throws on non-JSON input', () => {
    expect(extractByPath('not json at all', 'a.b')).toBeUndefined();
    expect(extractByPath('', 'a')).toBeUndefined();
  });
});
