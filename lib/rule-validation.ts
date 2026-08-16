import type { RuleDraft } from '../types/rules';

export type RuleField = 'name' | 'urlPattern' | 'targetUrl' | 'queryParams';

export type RuleValidationErrors = Partial<Record<RuleField, string>>;

const SUPPORTED_REDIRECT_PROTOCOLS = new Set(['http:', 'https:']);

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

  const urlPatternError = validateUrlPattern(rule.urlPattern);
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

  return errors;
}

export function isRuleDraftValid(rule: RuleDraft): boolean {
  return Object.keys(validateRuleDraft(rule)).length === 0;
}
