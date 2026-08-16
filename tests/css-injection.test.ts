import { describe, expect, it } from 'vitest';
import {
  getCssInjections,
  matchesPagePattern,
  validatePageMatchPattern,
} from '../lib/css-injection';
import type { InterceptorRule } from '../types/rules';

function createCssRule(
  overrides: Partial<InterceptorRule> = {},
): InterceptorRule {
  return {
    id: 'css-rule',
    name: 'Highlight staging',
    enabled: true,
    urlPattern: '*://*.example.com/*',
    action: { type: 'injectCss', css: 'body { outline: 3px solid blue; }' },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('CSS injection matching', () => {
  it('validates browser match patterns', () => {
    expect(validatePageMatchPattern('*://*.example.com/*')).toBeUndefined();
    expect(validatePageMatchPattern('||example.com^')).toBe(
      'Use a pattern such as *://*.example.com/*.',
    );
  });

  it('matches schemes, subdomains, paths, and queries', () => {
    expect(
      matchesPagePattern(
        '*://*.example.com/docs/*',
        'https://app.example.com/docs/page?debug=true',
      ),
    ).toBe(true);
    expect(
      matchesPagePattern(
        '*://*.example.com/docs/*',
        'https://app.example.com/account',
      ),
    ).toBe(false);
  });

  it('matches an apex host through a wildcard-host pattern', () => {
    expect(
      matchesPagePattern(
        '*://*.example.com/*',
        'https://example.com/',
      ),
    ).toBe(true);
  });

  it('returns only enabled matching CSS rules while Echo is active', () => {
    const rule = createCssRule();

    expect(
      getCssInjections([rule], true, 'https://www.example.com/page'),
    ).toEqual([
      { ruleId: 'css-rule', css: 'body { outline: 3px solid blue; }' },
    ]);
    expect(
      getCssInjections([rule], false, 'https://www.example.com/page'),
    ).toEqual([]);
    expect(
      getCssInjections(
        [createCssRule({ enabled: false })],
        true,
        'https://www.example.com/page',
      ),
    ).toEqual([]);
  });
});
