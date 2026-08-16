import { describe, expect, it } from 'vitest';
import {
  findMockResponse,
  getMockRulesForPage,
  validateMockResponseBody,
} from '../lib/response-mock';
import type { InterceptorRule } from '../types/rules';

function createMockRule(
  overrides: Partial<InterceptorRule> = {},
): InterceptorRule {
  return {
    id: 'mock-rule',
    name: 'Mock users',
    enabled: true,
    urlPattern: '*://*.example.com/*',
    action: {
      type: 'mockJsonResponse',
      requestPattern: '*://api.example.com/users*',
      statusCode: 200,
      responseBody: '[{"id":1}]',
    },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('mock JSON response rules', () => {
  it('validates JSON response bodies', () => {
    expect(validateMockResponseBody('{"ok":true}')).toBeUndefined();
    expect(validateMockResponseBody('')).toBe('Enter a JSON response body.');
    expect(validateMockResponseBody('{')).toBe('Enter valid JSON.');
  });

  it('selects enabled rules for matching pages', () => {
    expect(
      getMockRulesForPage(
        [createMockRule()],
        true,
        'https://app.example.com/',
      ),
    ).toEqual([
      {
        requestPattern: '*://api.example.com/users*',
        statusCode: 200,
        responseBody: '[{"id":1}]',
      },
    ]);
    expect(
      getMockRulesForPage(
        [createMockRule()],
        false,
        'https://app.example.com/',
      ),
    ).toEqual([]);
  });

  it('returns the first matching mock response', () => {
    const first = {
      requestPattern: '*api.example.com*',
      statusCode: 201,
      responseBody: '{"source":"first"}',
    };
    const second = {
      requestPattern: '*api.example.com/users*',
      statusCode: 200,
      responseBody: '{"source":"second"}',
    };

    expect(
      findMockResponse([first, second], 'https://api.example.com/users'),
    ).toEqual(first);
  });
});
