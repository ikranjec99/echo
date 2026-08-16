import { describe, expect, it } from 'vitest';
import {
  findRequestDelay,
  getDelayRulesForPage,
  matchesRequestPattern,
  validateRequestPattern,
} from '../lib/request-delay';
import type { InterceptorRule } from '../types/rules';

function createDelayRule(
  overrides: Partial<InterceptorRule> = {},
): InterceptorRule {
  return {
    id: 'delay-rule',
    name: 'Slow API',
    enabled: true,
    urlPattern: '*://*.example.com/*',
    action: {
      type: 'delayRequest',
      requestPattern: '*://api.example.com/*',
      delayMs: 1000,
    },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('request delay rules', () => {
  it('matches complete request URLs with wildcards', () => {
    expect(
      matchesRequestPattern(
        '*://api.example.com/*',
        'https://api.example.com/users?id=1',
      ),
    ).toBe(true);
    expect(
      matchesRequestPattern(
        '*://api.example.com/*',
        'https://www.example.com/',
      ),
    ).toBe(false);
  });

  it('validates request patterns', () => {
    expect(validateRequestPattern('*://api.example.com/*')).toBeUndefined();
    expect(validateRequestPattern('')).toBe('Enter a request URL pattern.');
  });

  it('selects active delay rules for matching pages', () => {
    expect(
      getDelayRulesForPage(
        [createDelayRule()],
        true,
        'https://example.com/',
      ),
    ).toEqual([
      { requestPattern: '*://api.example.com/*', delayMs: 1000 },
    ]);
    expect(
      getDelayRulesForPage(
        [createDelayRule()],
        false,
        'https://example.com/',
      ),
    ).toEqual([]);
  });

  it('uses the longest delay when multiple rules match', () => {
    expect(
      findRequestDelay(
        [
          { requestPattern: '*example.com*', delayMs: 500 },
          { requestPattern: '*api.example.com*', delayMs: 1500 },
        ],
        'https://api.example.com/users',
      ),
    ).toBe(1500);
  });
});
