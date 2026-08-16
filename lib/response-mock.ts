import type { InterceptorRule } from '../types/rules';
import { matchesPagePattern } from './css-injection';
import { matchesRequestPattern } from './request-delay';

export const MOCK_CONFIG_EVENT = 'echo:mock-config';
export const MAX_MOCK_BODY_BYTES = 100_000;

export type ActiveMockRule = {
  requestPattern: string;
  statusCode: number;
  responseBody: string;
};

export function validateMockResponseBody(body: string): string | undefined {
  if (!body.trim()) {
    return 'Enter a JSON response body.';
  }

  if (new Blob([body]).size > MAX_MOCK_BODY_BYTES) {
    return 'Mock JSON responses are limited to 100 KB.';
  }

  try {
    JSON.parse(body);
  } catch {
    return 'Enter valid JSON.';
  }

  return undefined;
}

export function getMockRulesForPage(
  rules: InterceptorRule[],
  interceptionEnabled: boolean,
  pageUrl: string,
): ActiveMockRule[] {
  if (!interceptionEnabled) {
    return [];
  }

  return rules.flatMap((rule) =>
    rule.enabled &&
    rule.action.type === 'mockJsonResponse' &&
    matchesPagePattern(rule.urlPattern, pageUrl)
      ? [
          {
            requestPattern: rule.action.requestPattern,
            statusCode: rule.action.statusCode,
            responseBody: rule.action.responseBody,
          },
        ]
      : [],
  );
}

export function findMockResponse(
  rules: ActiveMockRule[],
  requestUrl: string,
): ActiveMockRule | undefined {
  return rules.find(({ requestPattern }) =>
    matchesRequestPattern(requestPattern, requestUrl),
  );
}
