import { describe, expect, it } from 'vitest';
import {
  compileRules,
  REQUEST_RESOURCE_TYPES,
} from '../lib/rule-compiler';
import type { InterceptorRule } from '../types/rules';

function createRule(
  overrides: Partial<InterceptorRule> = {},
): InterceptorRule {
  return {
    id: 'rule-1',
    name: 'Block analytics',
    enabled: true,
    urlPattern: '||analytics.example.com^',
    action: { type: 'block' },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('compileRules', () => {
  it('compiles a block rule', () => {
    expect(compileRules([createRule()])).toEqual([
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '||analytics.example.com^',
          resourceTypes: REQUEST_RESOURCE_TYPES,
        },
      },
    ]);
  });

  it('compiles a redirect rule', () => {
    const rule = createRule({
      action: {
        type: 'redirect',
        targetUrl: 'http://localhost:3000',
      },
    });

    expect(compileRules([rule])).toEqual([
      {
        id: 1,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { url: 'http://localhost:3000' },
        },
        condition: {
          urlFilter: '||analytics.example.com^',
          resourceTypes: REQUEST_RESOURCE_TYPES,
        },
      },
    ]);
  });

  it('does not compile disabled rules', () => {
    expect(compileRules([createRule({ enabled: false })])).toEqual([]);
  });

  it('leaves CSS injection rules to the content-script engine', () => {
    expect(
      compileRules([
        createRule({
          action: { type: 'injectCss', css: 'body { color: red; }' },
        }),
      ]),
    ).toEqual([]);
  });

  it('leaves JavaScript injection rules to the user-script engine', () => {
    expect(
      compileRules([
        createRule({
          action: { type: 'injectJavaScript', script: 'console.log("Echo")' },
        }),
      ]),
    ).toEqual([]);
  });

  it('leaves page delay rules to the page bridge', () => {
    expect(
      compileRules([
        createRule({
          action: {
            type: 'delayRequest',
            requestPattern: '*://api.example.com/*',
            delayMs: 1000,
          },
        }),
      ]),
    ).toEqual([]);
  });

  it('compiles query-parameter transformations', () => {
    const rule = createRule({
      action: {
        type: 'modifyQuery',
        addOrReplaceParams: [{ key: 'debug', value: 'true' }],
        removeParams: ['utm_source'],
      },
    });

    expect(compileRules([rule])[0]?.action).toEqual({
      type: 'redirect',
      redirect: {
        transform: {
          queryTransform: {
            addOrReplaceParams: [{ key: 'debug', value: 'true' }],
            removeParams: ['utm_source'],
          },
        },
      },
    });
  });

  it('compiles request-header modifications', () => {
    const requestHeaders = [
      { operation: 'set' as const, header: 'x-debug', value: 'true' },
      { operation: 'remove' as const, header: 'referer' },
    ];
    const rule = createRule({
      action: { type: 'modifyRequestHeaders', requestHeaders },
    });

    expect(compileRules([rule])[0]?.action).toEqual({
      type: 'modifyHeaders',
      requestHeaders,
    });
  });

  it('compiles response-header modifications', () => {
    const responseHeaders = [
      {
        operation: 'set' as const,
        header: 'cache-control',
        value: 'no-store',
      },
      { operation: 'remove' as const, header: 'server' },
    ];
    const rule = createRule({
      action: { type: 'modifyResponseHeaders', responseHeaders },
    });

    expect(compileRules([rule])[0]?.action).toEqual({
      type: 'modifyHeaders',
      responseHeaders,
    });
  });

  it('assigns deterministic browser ids from source positions', () => {
    const rules = [
      createRule({ id: 'disabled', enabled: false }),
      createRule({ id: 'enabled', urlPattern: '||example.com^' }),
    ];

    expect(compileRules(rules)).toEqual([
      {
        id: 2,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '||example.com^',
          resourceTypes: REQUEST_RESOURCE_TYPES,
        },
      },
    ]);
  });

  it('targets page, API, and subresource requests explicitly', () => {
    const [compiledRule] = compileRules([createRule()]);

    expect(compiledRule?.condition.resourceTypes).toEqual(
      expect.arrayContaining([
        'main_frame',
        'sub_frame',
        'script',
        'image',
        'xmlhttprequest',
        'websocket',
      ]),
    );
  });
});
