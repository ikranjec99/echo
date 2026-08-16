import type { RuleDraft } from '../types/rules';
import { validatePageMatchPattern } from './css-injection';

export type RuleField =
  | 'name'
  | 'urlPattern'
  | 'targetUrl'
  | 'queryParams'
  | 'requestHeaders'
  | 'responseHeaders'
  | 'css';

export type RuleValidationErrors = Partial<Record<RuleField, string>>;

const SUPPORTED_REDIRECT_PROTOCOLS = new Set(['http:', 'https:']);
const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u;
const SENSITIVE_REQUEST_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
]);

export function validateUrlPattern(urlPattern: string): string | undefined {
  const pattern = urlPattern.trim();

  if (!pattern) {
    return 'Enter a URL pattern.';
  }

  if (/\s/u.test(pattern)) {
    return 'URL patterns cannot contain spaces.';
  }

  return undefined;
}

export function validateRedirectUrl(targetUrl: string): string | undefined {
  const value = targetUrl.trim();

  if (!value) {
    return 'Enter a redirect URL.';
  }

  try {
    const url = new URL(value);

    if (!SUPPORTED_REDIRECT_PROTOCOLS.has(url.protocol)) {
      return 'Redirect URLs must use HTTP or HTTPS.';
    }
  } catch {
    return 'Enter a valid absolute redirect URL.';
  }

  return undefined;
}

export function validateRuleDraft(
  rule: RuleDraft,
): RuleValidationErrors {
  const errors: RuleValidationErrors = {};

  if (!rule.name.trim()) {
    errors.name = 'Enter a rule name.';
  }

  const urlPatternError =
    rule.action.type === 'injectCss'
      ? validatePageMatchPattern(rule.urlPattern)
      : validateUrlPattern(rule.urlPattern);
  if (urlPatternError) {
    errors.urlPattern = urlPatternError;
  }

  if (rule.action.type === 'redirect') {
    const targetUrlError = validateRedirectUrl(rule.action.targetUrl);
    if (targetUrlError) {
      errors.targetUrl = targetUrlError;
    }
  }

  if (rule.action.type === 'modifyQuery') {
    const { addOrReplaceParams, removeParams } = rule.action;
    const allKeys = [
      ...addOrReplaceParams.map(({ key }) => key.trim()),
      ...removeParams.map((key) => key.trim()),
    ];

    if (allKeys.length === 0) {
      errors.queryParams = 'Add or remove at least one query parameter.';
    } else if (allKeys.some((key) => !key)) {
      errors.queryParams = 'Query parameter names cannot be empty.';
    } else if (new Set(allKeys).size !== allKeys.length) {
      errors.queryParams = 'Each query parameter can appear only once.';
    }
  }

  if (rule.action.type === 'modifyRequestHeaders') {
    const operations = rule.action.requestHeaders;
    const normalizedNames = operations.map(({ header }) =>
      header.trim().toLowerCase(),
    );

    if (operations.length === 0) {
      errors.requestHeaders = 'Set or remove at least one request header.';
    } else if (
      normalizedNames.some((header) => !HEADER_NAME_PATTERN.test(header))
    ) {
      errors.requestHeaders = 'Enter valid HTTP header names.';
    } else if (new Set(normalizedNames).size !== normalizedNames.length) {
      errors.requestHeaders = 'Each request header can appear only once.';
    } else if (
      operations.some(
        ({ header, operation }) =>
          operation === 'set' &&
          SENSITIVE_REQUEST_HEADERS.has(header.trim().toLowerCase()),
      )
    ) {
      errors.requestHeaders =
        'Echo does not store authorization, cookie, or proxy credentials.';
    }
  }

  if (rule.action.type === 'modifyResponseHeaders') {
    const operations = rule.action.responseHeaders;
    const normalizedNames = operations.map(({ header }) =>
      header.trim().toLowerCase(),
    );

    if (operations.length === 0) {
      errors.responseHeaders = 'Set or remove at least one response header.';
    } else if (
      normalizedNames.some((header) => !HEADER_NAME_PATTERN.test(header))
    ) {
      errors.responseHeaders = 'Enter valid HTTP header names.';
    } else if (new Set(normalizedNames).size !== normalizedNames.length) {
      errors.responseHeaders = 'Each response header can appear only once.';
    } else if (
      operations.some(
        ({ header, operation }) =>
          operation === 'set' && header.trim().toLowerCase() === 'set-cookie',
      )
    ) {
      errors.responseHeaders = 'Echo does not store Set-Cookie values.';
    }
  }

  if (rule.action.type === 'injectCss' && !rule.action.css.trim()) {
    errors.css = 'Enter CSS to inject.';
  }

  return errors;
}

export function isRuleDraftValid(rule: RuleDraft): boolean {
  return Object.keys(validateRuleDraft(rule)).length === 0;
}
