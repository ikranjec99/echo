import { describe, expect, it } from 'vitest';
import { duplicateRule } from '../lib/rule-duplication';
import type { InterceptorRule } from '../types/rules';

describe('rule duplication', () => {
  it('creates a disabled copy with a fresh identity and timestamps', () => {
    const rule: InterceptorRule = {
      id: 'original-rule',
      name: 'Block analytics',
      enabled: true,
      urlPattern: '||analytics.example.com^',
      action: { type: 'block' },
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    };

    expect(
      duplicateRule(
        rule,
        'copied-rule',
        '2026-08-16T01:00:00.000Z',
      ),
    ).toEqual({
      ...rule,
      id: 'copied-rule',
      name: 'Block analytics copy',
      enabled: false,
      createdAt: '2026-08-16T01:00:00.000Z',
      updatedAt: '2026-08-16T01:00:00.000Z',
    });
  });
});
