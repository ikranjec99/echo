import type { InterceptorRule } from '../types/rules';

export function duplicateRule(
  rule: InterceptorRule,
  id: string = crypto.randomUUID(),
  timestamp: string = new Date().toISOString(),
): InterceptorRule {
  return {
    ...rule,
    id,
    name: `${rule.name} copy`,
    enabled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
