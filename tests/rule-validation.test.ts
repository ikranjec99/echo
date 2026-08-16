import { describe, expect, it } from 'vitest';
import {
  isRuleDraftValid,
  validateRedirectUrl,
  validateRuleDraft,
  validateUrlPattern,
} from '../lib/rule-validation';
import type { RuleDraft } from '../types/rules';

const validBlockRule: RuleDraft = {
  name: 'Block analytics',
  enabled: true,
  urlPattern: '||analytics.example.com^',
  action: { type: 'block' },
};

describe('validateUrlPattern', () => {
  it('accepts a non-empty pattern without spaces', () => {
    expect(validateUrlPattern('||example.com^')).toBeUndefined();
  });

  it('rejects an empty pattern', () => {
    expect(validateUrlPattern('   ')).toBe('Enter a URL pattern.');
  });

  it('rejects patterns containing whitespace', () => {
    expect(validateUrlPattern('*://example.com/private path')).toBe(
      'URL patterns cannot contain spaces.',
    );
  });
});

describe('validateRedirectUrl', () => {
  it.each(['https://example.com/path', 'http://localhost:3000']) (
    'accepts %s',
    (url) => {
      expect(validateRedirectUrl(url)).toBeUndefined();
    },
  );

  it('requires an absolute URL', () => {
    expect(validateRedirectUrl('/local/path')).toBe(
      'Enter a valid absolute redirect URL.',
    );
  });

  it('rejects unsupported protocols', () => {
    expect(validateRedirectUrl('javascript:alert(1)')).toBe(
      'Redirect URLs must use HTTP or HTTPS.',
    );
  });
});

describe('validateRuleDraft', () => {
  it('accepts a valid block rule', () => {
    expect(validateRuleDraft(validBlockRule)).toEqual({});
    expect(isRuleDraftValid(validBlockRule)).toBe(true);
  });

  it('validates redirect fields only for redirect rules', () => {
    const redirectRule: RuleDraft = {
      ...validBlockRule,
      action: { type: 'redirect', targetUrl: '' },
    };

    expect(validateRuleDraft(redirectRule)).toEqual({
      targetUrl: 'Enter a redirect URL.',
    });
    expect(isRuleDraftValid(redirectRule)).toBe(false);
  });

  it('returns errors for every invalid common field', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        name: ' ',
        urlPattern: ' ',
      }),
    ).toEqual({
      name: 'Enter a rule name.',
      urlPattern: 'Enter a URL pattern.',
    });
  });

  it('requires at least one query-parameter operation', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyQuery',
          addOrReplaceParams: [],
          removeParams: [],
        },
      }),
    ).toEqual({
      queryParams: 'Add or remove at least one query parameter.',
    });
  });

  it('rejects duplicate query parameters across operations', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyQuery',
          addOrReplaceParams: [{ key: 'debug', value: 'true' }],
          removeParams: ['debug'],
        },
      }),
    ).toEqual({
      queryParams: 'Each query parameter can appear only once.',
    });
  });

  it('accepts request-header set and remove operations', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyRequestHeaders',
          requestHeaders: [
            { operation: 'set', header: 'x-debug', value: 'true' },
            { operation: 'remove', header: 'referer' },
          ],
        },
      }),
    ).toEqual({});
  });

  it('does not allow sensitive request-header values to be stored', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyRequestHeaders',
          requestHeaders: [
            { operation: 'set', header: 'Authorization', value: 'secret' },
          ],
        },
      }),
    ).toEqual({
      requestHeaders:
        'Echo does not store authorization, cookie, or proxy credentials.',
    });
  });

  it('accepts response-header set and remove operations', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyResponseHeaders',
          responseHeaders: [
            { operation: 'set', header: 'cache-control', value: 'no-store' },
            { operation: 'remove', header: 'server' },
          ],
        },
      }),
    ).toEqual({});
  });

  it('does not allow Set-Cookie values to be stored', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        action: {
          type: 'modifyResponseHeaders',
          responseHeaders: [
            { operation: 'set', header: 'Set-Cookie', value: 'secret=true' },
          ],
        },
      }),
    ).toEqual({
      responseHeaders: 'Echo does not store Set-Cookie values.',
    });
  });

  it('validates CSS injection rules', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        urlPattern: '*://*.example.com/*',
        action: { type: 'injectCss', css: '' },
      }),
    ).toEqual({ css: 'Enter CSS to inject.' });
  });

  it('validates JavaScript injection rules', () => {
    expect(
      validateRuleDraft({
        ...validBlockRule,
        urlPattern: '*://*.example.com/*',
        action: { type: 'injectJavaScript', script: '' },
      }),
    ).toEqual({ script: 'Enter JavaScript to inject.' });
  });
});
