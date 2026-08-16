import { browser } from 'wxt/browser';
import type { InterceptorRule, RuleAction } from '../types/rules';

const RULES_STORAGE_KEY = 'rules';

export type RuleStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

export type RuleStorage = {
  list(): Promise<InterceptorRule[]>;
  remove(ruleId: string): Promise<void>;
  save(rule: InterceptorRule): Promise<void>;
};

function isRuleAction(value: unknown): value is RuleAction {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const action = value as Record<string, unknown>;

  if (action.type === 'block') {
    return true;
  }

  if (action.type === 'redirect') {
    return typeof action.targetUrl === 'string';
  }

  if (
    action.type === 'modifyQuery' &&
    Array.isArray(action.addOrReplaceParams) &&
    action.addOrReplaceParams.every(
      (param) =>
        !!param &&
        typeof param === 'object' &&
        typeof (param as Record<string, unknown>).key === 'string' &&
        typeof (param as Record<string, unknown>).value === 'string',
    ) &&
    Array.isArray(action.removeParams) &&
    action.removeParams.every((key) => typeof key === 'string')
  ) {
    return true;
  }

  if (
    action.type === 'modifyRequestHeaders' &&
    Array.isArray(action.requestHeaders) &&
    action.requestHeaders.every((operation) => {
      if (!operation || typeof operation !== 'object') {
        return false;
      }

      const headerOperation = operation as Record<string, unknown>;

      return (
        typeof headerOperation.header === 'string' &&
        (headerOperation.operation === 'remove' ||
          (headerOperation.operation === 'set' &&
            typeof headerOperation.value === 'string'))
      );
    })
  ) {
    return true;
  }

  if (
    action.type === 'modifyResponseHeaders' &&
    Array.isArray(action.responseHeaders) &&
    action.responseHeaders.every((operation) => {
      if (!operation || typeof operation !== 'object') {
        return false;
      }

      const headerOperation = operation as Record<string, unknown>;

      return (
        typeof headerOperation.header === 'string' &&
        (headerOperation.operation === 'remove' ||
          (headerOperation.operation === 'set' &&
            typeof headerOperation.value === 'string'))
      );
    })
  ) {
    return true;
  }

  if (action.type === 'injectCss') {
    return typeof action.css === 'string';
  }

  if (action.type === 'injectJavaScript') {
    return typeof action.script === 'string';
  }

  return (
    action.type === 'delayRequest' &&
    typeof action.requestPattern === 'string' &&
    typeof action.delayMs === 'number'
  );
}

export function isInterceptorRule(value: unknown): value is InterceptorRule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rule = value as Record<string, unknown>;

  return (
    typeof rule.id === 'string' &&
    typeof rule.name === 'string' &&
    typeof rule.enabled === 'boolean' &&
    typeof rule.urlPattern === 'string' &&
    isRuleAction(rule.action) &&
    typeof rule.createdAt === 'string' &&
    typeof rule.updatedAt === 'string'
  );
}

export function createRuleStorage(
  storageArea: RuleStorageArea = browser.storage.local,
): RuleStorage {
  async function list(): Promise<InterceptorRule[]> {
    const stored = await storageArea.get(RULES_STORAGE_KEY);
    const rules = stored[RULES_STORAGE_KEY];

    return Array.isArray(rules) ? rules.filter(isInterceptorRule) : [];
  }

  async function save(rule: InterceptorRule): Promise<void> {
    const rules = await list();
    const existingIndex = rules.findIndex(({ id }) => id === rule.id);

    if (existingIndex === -1) {
      rules.push(rule);
    } else {
      rules[existingIndex] = rule;
    }

    await storageArea.set({ [RULES_STORAGE_KEY]: rules });
  }

  async function remove(ruleId: string): Promise<void> {
    const rules = await list();
    const remainingRules = rules.filter(({ id }) => id !== ruleId);

    await storageArea.set({ [RULES_STORAGE_KEY]: remainingRules });
  }

  return { list, remove, save };
}
