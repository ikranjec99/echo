import type { InterceptorRule } from '../types/rules';

const MATCH_PATTERN = /^(\*|https?):\/\/(\*|\*\.[^/*]+|[^/*]+)\/.*$/u;

function escapeRegularExpression(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
}

export function validatePageMatchPattern(pattern: string): string | undefined {
  const value = pattern.trim();

  if (!value) {
    return 'Enter a page match pattern.';
  }

  if (value === '<all_urls>') {
    return undefined;
  }

  if (!MATCH_PATTERN.test(value)) {
    return 'Use a pattern such as *://*.example.com/*.';
  }

  return undefined;
}

export function matchesPagePattern(pattern: string, urlValue: string): boolean {
  if (pattern === '<all_urls>') {
    return /^https?:/u.test(urlValue);
  }

  if (validatePageMatchPattern(pattern)) {
    return false;
  }

  const separatorIndex = pattern.indexOf('://');
  const schemePattern = pattern.slice(0, separatorIndex);
  const remainder = pattern.slice(separatorIndex + 3);
  const pathIndex = remainder.indexOf('/');
  const hostPattern = remainder.slice(0, pathIndex);
  const pathPattern = remainder.slice(pathIndex);

  try {
    const url = new URL(urlValue);
    const schemeMatches =
      schemePattern === '*'
        ? url.protocol === 'http:' || url.protocol === 'https:'
        : url.protocol === `${schemePattern}:`;
    const wildcardHost = hostPattern.startsWith('*.')
      ? hostPattern.slice(2)
      : null;
    const hostMatches =
      hostPattern === '*' ||
      url.hostname === hostPattern ||
      (wildcardHost !== null &&
        (url.hostname === wildcardHost ||
          url.hostname.endsWith(`.${wildcardHost}`)));
    const pathExpression = new RegExp(
      `^${escapeRegularExpression(pathPattern).replace(/\*/gu, '.*')}$`,
      'u',
    );

    return (
      schemeMatches &&
      hostMatches &&
      pathExpression.test(`${url.pathname}${url.search}`)
    );
  } catch {
    return false;
  }
}

export function getCssInjections(
  rules: InterceptorRule[],
  interceptionEnabled: boolean,
  url: string,
): Array<{ ruleId: string; css: string }> {
  if (!interceptionEnabled) {
    return [];
  }

  return rules.flatMap((rule) =>
    rule.enabled &&
    rule.action.type === 'injectCss' &&
    matchesPagePattern(rule.urlPattern, url)
      ? [{ ruleId: rule.id, css: rule.action.css }]
      : [],
  );
}
