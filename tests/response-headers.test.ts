import { describe, expect, it } from 'vitest';
import {
  formatRemoveResponseHeaders,
  formatSetResponseHeaders,
  parseRemoveResponseHeaders,
  parseSetResponseHeaders,
} from '../lib/response-headers';

describe('response header form conversion', () => {
  it('parses set operations at the first colon', () => {
    expect(
      parseSetResponseHeaders('Cache-Control: no-store\nX-Time: 10:30'),
    ).toEqual([
      { operation: 'set', header: 'cache-control', value: 'no-store' },
      { operation: 'set', header: 'x-time', value: '10:30' },
    ]);
  });

  it('parses remove operations from lines or commas', () => {
    expect(parseRemoveResponseHeaders('Server, X-Powered-By')).toEqual([
      { operation: 'remove', header: 'server' },
      { operation: 'remove', header: 'x-powered-by' },
    ]);
  });

  it('formats saved operations for editing', () => {
    const operations = [
      { operation: 'set' as const, header: 'x-echo', value: 'working' },
      { operation: 'remove' as const, header: 'server' },
    ];

    expect(formatSetResponseHeaders(operations)).toBe('x-echo: working');
    expect(formatRemoveResponseHeaders(operations)).toBe('server');
  });
});
