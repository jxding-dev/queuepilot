import { describe, it, expect } from 'vitest';
import { extractTokens, substitute, substituteUrl, unresolvedTokens } from './templating';

describe('extractTokens', () => {
  it('finds multiple distinct tokens in order', () => {
    expect(extractTokens('{{a}}/{{b}}?x={{c}}')).toEqual(['a', 'b', 'c']);
  });

  it('ignores whitespace inside braces', () => {
    expect(extractTokens('{{ email }}')).toEqual(['email']);
  });

  it('dedupes a token used twice', () => {
    expect(extractTokens('{{id}}-{{id}}')).toEqual(['id']);
  });

  it('returns nothing for text without tokens', () => {
    expect(extractTokens('https://api.example.com/users')).toEqual([]);
  });
});

describe('substitute', () => {
  const row = { name: 'Mina', email: 'mina@x.com', empty: '' };

  it('replaces multiple tokens with cell values', () => {
    expect(substitute('/users/{{name}}?e={{email}}', row)).toBe('/users/Mina?e=mina@x.com');
  });

  it('replaces every occurrence of a token used twice', () => {
    expect(substitute('{{name}}-{{name}}', row)).toBe('Mina-Mina');
  });

  it('treats an empty cell as an empty string', () => {
    expect(substitute('x={{empty}}', row)).toBe('x=');
  });

  it('treats an unknown column as an empty string', () => {
    expect(substitute('x={{nope}}', row)).toBe('x=');
  });

  it('ignores whitespace inside braces when resolving', () => {
    expect(substitute('{{ name }}', row)).toBe('Mina');
  });

  describe('with jsonEscape', () => {
    it('escapes quotes, newlines and backslashes into a valid JSON body', () => {
      const messy = { note: 'she said "hi"\nback\\slash\ttab' };
      const body = substitute('{"note":"{{note}}"}', messy, { jsonEscape: true });
      // The whole body must parse and round-trip the original value exactly.
      expect(() => JSON.parse(body)).not.toThrow();
      expect(JSON.parse(body)).toEqual({ note: 'she said "hi"\nback\\slash\ttab' });
    });

    it('leaves a numeric value verbatim so unquoted usage stays valid', () => {
      const body = substitute('{"count": {{count}}}', { count: '42' }, { jsonEscape: true });
      expect(body).toBe('{"count": 42}');
      expect(JSON.parse(body)).toEqual({ count: 42 });
    });

    it('does not escape when jsonEscape is off', () => {
      const body = substitute('{{note}}', { note: 'a"b' });
      expect(body).toBe('a"b');
    });
  });
});

describe('substituteUrl', () => {
  it('percent-encodes values so &, #, + and spaces cannot break the URL', () => {
    const row = { email: 'a+b@x.com', q: 'a b&c=1#frag' };
    expect(substituteUrl('https://api.x.com/u?e={{email}}&q={{q}}', row)).toBe(
      'https://api.x.com/u?e=a%2Bb%40x.com&q=a%20b%26c%3D1%23frag',
    );
  });

  it('inserts the value raw when the whole template is a single token', () => {
    const row = { url: 'https://api.x.com/users?page=2' };
    expect(substituteUrl('{{url}}', row)).toBe('https://api.x.com/users?page=2');
    expect(substituteUrl('  {{ url }} ', row)).toBe('  https://api.x.com/users?page=2 ');
  });

  it('encodes path segments in a mixed template', () => {
    expect(substituteUrl('https://x.com/users/{{id}}', { id: '1/2?x' })).toBe(
      'https://x.com/users/1%2F2%3Fx',
    );
  });
});

describe('unresolvedTokens', () => {
  const columns = ['name', 'email'];

  it('flags tokens that match no column', () => {
    expect(unresolvedTokens('{{name}}/{{user_id}}', columns)).toEqual(['user_id']);
  });

  it('returns nothing when all tokens resolve', () => {
    expect(unresolvedTokens('{{name}}-{{email}}', columns)).toEqual([]);
  });

  it('is case-sensitive', () => {
    expect(unresolvedTokens('{{Name}}', columns)).toEqual(['Name']);
  });

  it('dedupes a repeated unresolved token', () => {
    expect(unresolvedTokens('{{x}}{{x}}', columns)).toEqual(['x']);
  });
});
