import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuleStorage } from '../lib/rule-storage';
import { createRulesStore } from '../store/rules-store';
import type { InterceptorRule } from '../types/rules';

const fixedNow = '2026-08-16T02:00:00.000Z';

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

function createStorage(rules: InterceptorRule[] = []): RuleStorage {
  return {
    list: vi.fn().mockResolvedValue(rules),
    remove: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('rules store', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads persisted rules', async () => {
    const rule = createRule();
    const store = createRulesStore({ storage: createStorage([rule]) });

    await store.getState().loadRules();

    expect(store.getState()).toMatchObject({
      rules: [rule],
      status: 'ready',
      errorMessage: null,
    });
  });

  it('saves and adds a new rule to state', async () => {
    const storage = createStorage();
    const store = createRulesStore({ storage });
    const rule = createRule();

    await store.getState().saveRule(rule);

    expect(storage.save).toHaveBeenCalledWith(rule);
    expect(store.getState().rules).toEqual([rule]);
  });

  it('removes a persisted rule from state', async () => {
    const rule = createRule();
    const storage = createStorage([rule]);
    const store = createRulesStore({ storage });
    await store.getState().loadRules();

    await store.getState().removeRule(rule.id);

    expect(storage.remove).toHaveBeenCalledWith(rule.id);
    expect(store.getState().rules).toEqual([]);
  });

  it('toggles a rule and updates its timestamp', async () => {
    const rule = createRule();
    const storage = createStorage([rule]);
    const store = createRulesStore({ storage, now: () => fixedNow });
    await store.getState().loadRules();

    await store.getState().toggleRule(rule.id, false);

    const updatedRule = {
      ...rule,
      enabled: false,
      updatedAt: fixedNow,
    };
    expect(storage.save).toHaveBeenCalledWith(updatedRule);
    expect(store.getState().rules).toEqual([updatedRule]);
  });

  it('exposes storage failures without discarding existing rules', async () => {
    const rule = createRule();
    const storage = createStorage([rule]);
    const store = createRulesStore({ storage });
    await store.getState().loadRules();
    vi.mocked(storage.remove).mockRejectedValueOnce(new Error('Storage failed.'));

    await store.getState().removeRule(rule.id);

    expect(store.getState()).toMatchObject({
      rules: [rule],
      status: 'error',
      errorMessage: 'Storage failed.',
    });
  });
});
