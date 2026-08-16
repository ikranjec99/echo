import { describe, expect, it } from 'vitest';
import {
  formatAddOrReplaceParams,
  formatRemoveParams,
  parseAddOrReplaceParams,
  parseRemoveParams,
} from '../lib/query-parameters';

describe('query parameter form conversion', () => {
  it('parses add-or-replace lines at the first equals sign', () => {
    expect(parseAddOrReplaceParams('debug=true\ntoken=a=b\nempty')).toEqual([
      { key: 'debug', value: 'true' },
      { key: 'token', value: 'a=b' },
      { key: 'empty', value: '' },
    ]);
  });

  it('parses removed parameter names from lines or commas', () => {
    expect(parseRemoveParams('utm_source, utm_medium\ndebug')).toEqual([
      'utm_source',
      'utm_medium',
      'debug',
    ]);
  });

  it('formats saved operations for editing', () => {
    expect(
      formatAddOrReplaceParams([{ key: 'debug', value: 'true' }]),
    ).toBe('debug=true');
    expect(formatRemoveParams(['utm_source', 'utm_medium'])).toBe(
      'utm_source\nutm_medium',
    );
  });
});
