import type { InterceptorRule } from '../types/rules';
import { isInterceptorRule } from './rule-storage';
import { isRuleDraftValid } from './rule-validation';

const BACKUP_FORMAT_VERSION = 1;

type RuleBackup = {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  rules: InterceptorRule[];
};

export function serializeRuleBackup(
  rules: InterceptorRule[],
  exportedAt = new Date().toISOString(),
): string {
  const backup: RuleBackup = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    rules,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseRuleBackup(contents: string): InterceptorRule[] {
  let value: unknown;

  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!value || typeof value !== 'object') {
    throw new Error('The selected file is not an Echo rules backup.');
  }

  const backup = value as Record<string, unknown>;

  if (backup.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('This Echo backup version is not supported.');
  }

  if (!Array.isArray(backup.rules)) {
    throw new Error('The backup does not contain a rules list.');
  }

  if (!backup.rules.every(isInterceptorRule)) {
    throw new Error('The backup contains malformed rules.');
  }

  if (!backup.rules.every(isRuleDraftValid)) {
    throw new Error('The backup contains rules that are not valid in Echo.');
  }

  if (new Set(backup.rules.map(({ id }) => id)).size !== backup.rules.length) {
    throw new Error('The backup contains duplicate rule identifiers.');
  }

  return backup.rules;
}

export function prepareRulesForImport(
  rules: InterceptorRule[],
  createId: () => string = () => crypto.randomUUID(),
  importedAt = new Date().toISOString(),
): InterceptorRule[] {
  return rules.map((rule) => ({
    ...rule,
    id: createId(),
    enabled: false,
    createdAt: importedAt,
    updatedAt: importedAt,
  }));
}
