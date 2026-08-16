import { describe, expect, it } from 'vitest';
import {
  createRuleStorage,
  type RuleStorageArea,
} from '../lib/rule-storage';
import type { InterceptorRule } from '../types/rules';

function createMemoryStorage(
  initialData: Record<string, unknown> = {},
): RuleStorageArea {
  const data = { ...initialData };

  return {
    async get(key) {
      return { [key]: data[key] };
    },
    async set(items) {
      Object.assign(data, items);
    },
  };
}

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

describe('rule storage', () => {
  it('returns an empty list when no rules are stored', async () => {
    const storage = createRuleStorage(createMemoryStorage());

    await expect(storage.list()).resolves.toEqual([]);
  });

  it('saves a new rule', async () => {
    const storage = createRuleStorage(createMemoryStorage());
    const rule = createRule();

    await storage.save(rule);

    await expect(storage.list()).resolves.toEqual([rule]);
  });

  it('updates an existing rule without creating a duplicate', async () => {
    const rule = createRule();
    const storage = createRuleStorage(
      createMemoryStorage({ rules: [rule] }),
    );
    const updatedRule = createRule({
      name: 'Block telemetry',
      updatedAt: '2026-08-16T01:00:00.000Z',
    });

    await storage.save(updatedRule);

    await expect(storage.list()).resolves.toEqual([updatedRule]);
  });

  it('deletes a rule by id', async () => {
    const firstRule = createRule();
    const secondRule = createRule({ id: 'rule-2', name: 'Block ads' });
    const storage = createRuleStorage(
      createMemoryStorage({ rules: [firstRule, secondRule] }),
    );

    await storage.remove(firstRule.id);

    await expect(storage.list()).resolves.toEqual([secondRule]);
  });

  it('ignores malformed stored values', async () => {
    const validRule = createRule();
    const storage = createRuleStorage(
      createMemoryStorage({
        rules: [validRule, null, { id: 'broken' }, 'invalid'],
      }),
    );

    await expect(storage.list()).resolves.toEqual([validRule]);
  });
});
