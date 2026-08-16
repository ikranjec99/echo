import { describe, expect, it } from 'vitest';
import {
  formatRemoveRequestHeaders,
  formatSetRequestHeaders,
  parseRemoveRequestHeaders,
  parseSetRequestHeaders,
} from '../lib/request-headers';

describe('request header form conversion', () => {
  it('parses set operations at the first colon', () => {
    expect(parseSetRequestHeaders('X-Debug: true\nX-Time: 10:30')).toEqual([
      { operation: 'set', header: 'x-debug', value: 'true' },
      { operation: 'set', header: 'x-time', value: '10:30' },
    ]);
  });

  it('parses remove operations from lines or commas', () => {
    expect(parseRemoveRequestHeaders('Referer, X-Debug')).toEqual([
      { operation: 'remove', header: 'referer' },
      { operation: 'remove', header: 'x-debug' },
    ]);
  });

  it('formats saved operations for editing', () => {
    const operations = [
      { operation: 'set' as const, header: 'x-debug', value: 'true' },
      { operation: 'remove' as const, header: 'referer' },
    ];

    expect(formatSetRequestHeaders(operations)).toBe('x-debug: true');
    expect(formatRemoveRequestHeaders(operations)).toBe('referer');
  });
});
