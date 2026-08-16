import { describe, expect, it, vi } from 'vitest';
import { REQUEST_RESOURCE_TYPES } from '../lib/rule-compiler';
import {
  synchronizeDynamicRules,
  type DynamicRulesApi,
  type RuleSource,
} from '../lib/rule-sync';
import type { InterceptorRule } from '../types/rules';

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

function createRuleSource(rules: InterceptorRule[]): RuleSource {
  return { list: vi.fn().mockResolvedValue(rules) };
}

function createDynamicRulesApi(
  installedRuleIds: number[] = [],
): DynamicRulesApi & { updateDynamicRules: ReturnType<typeof vi.fn> } {
  return {
    getDynamicRules: vi.fn().mockResolvedValue(
      installedRuleIds.map((id) => ({
        id,
        priority: 1,
        action: { type: 'block' as const },
        condition: { urlFilter: 'old-pattern' },
      })),
    ),
    updateDynamicRules: vi.fn().mockResolvedValue(undefined),
  };
}

describe('synchronizeDynamicRules', () => {
  it('installs compiled enabled rules', async () => {
    const api = createDynamicRulesApi();

    await synchronizeDynamicRules(createRuleSource([createRule()]), api);

    expect(api.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: '||analytics.example.com^',
            resourceTypes: REQUEST_RESOURCE_TYPES,
          },
        },
      ],
    });
  });

  it('removes previously installed rules before replacement', async () => {
    const api = createDynamicRulesApi([4, 9]);

    await synchronizeDynamicRules(createRuleSource([]), api);

    expect(api.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [4, 9],
      addRules: [],
    });
  });

  it('excludes disabled stored rules', async () => {
    const api = createDynamicRulesApi([1]);

    await synchronizeDynamicRules(
      createRuleSource([createRule({ enabled: false })]),
      api,
    );

    expect(api.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [1],
      addRules: [],
    });
  });

  it('removes installed rules without compiling saved rules while paused', async () => {
    const api = createDynamicRulesApi([1]);

    await synchronizeDynamicRules(createRuleSource([createRule()]), api, false);

    expect(api.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [1],
      addRules: [],
    });
  });
});
