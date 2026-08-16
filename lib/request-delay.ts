import { matchesPagePattern } from './css-injection';
import type { InterceptorRule } from '../types/rules';

export const DELAY_CONFIG_EVENT = 'echo:delay-config';
export const DELAY_READY_EVENT = 'echo:delay-ready';
export const MAX_DELAY_MS = 30_000;

export type ActiveDelayRule = {
  requestPattern: string;
  delayMs: number;
};

function escapeRegularExpression(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
}

export function matchesRequestPattern(pattern: string, url: string): boolean {
  const expression = new RegExp(
    `^${escapeRegularExpression(pattern).replace(/\*/gu, '.*')}$`,
    'u',
  );

  return expression.test(url);
}

export function validateRequestPattern(pattern: string): string | undefined {
  if (!pattern.trim()) {
    return 'Enter a request URL pattern.';
  }

  if (/\s/u.test(pattern)) {
    return 'Request URL patterns cannot contain spaces.';
  }

  return undefined;
}

export function getDelayRulesForPage(
  rules: InterceptorRule[],
  interceptionEnabled: boolean,
  pageUrl: string,
): ActiveDelayRule[] {
  if (!interceptionEnabled) {
    return [];
  }

  return rules.flatMap((rule) =>
    rule.enabled &&
    rule.action.type === 'delayRequest' &&
    matchesPagePattern(rule.urlPattern, pageUrl)
      ? [
          {
            requestPattern: rule.action.requestPattern,
            delayMs: rule.action.delayMs,
          },
        ]
      : [],
  );
}

export function findRequestDelay(
  rules: ActiveDelayRule[],
  requestUrl: string,
): number {
  return rules.reduce(
    (delay, rule) =>
      matchesRequestPattern(rule.requestPattern, requestUrl)
        ? Math.max(delay, rule.delayMs)
        : delay,
    0,
  );
}
