import { createStore } from 'zustand/vanilla';
import type { RuleStorage } from '../lib/rule-storage';
import type { InterceptorRule } from '../types/rules';

export type RulesStatus = 'idle' | 'loading' | 'ready' | 'error';

export type RulesState = {
  rules: InterceptorRule[];
  status: RulesStatus;
  errorMessage: string | null;
  loadRules(): Promise<void>;
  removeRule(ruleId: string): Promise<void>;
  saveRule(rule: InterceptorRule): Promise<void>;
  toggleRule(ruleId: string, enabled: boolean): Promise<void>;
};

type RulesStoreDependencies = {
  storage: RuleStorage;
  now?: () => string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function createRulesStore({
  storage,
  now = () => new Date().toISOString(),
}: RulesStoreDependencies) {
  return createStore<RulesState>()((set, get) => ({
    rules: [],
    status: 'idle',
    errorMessage: null,

    async loadRules() {
      set({ status: 'loading', errorMessage: null });

      try {
        const rules = await storage.list();
        set({ rules, status: 'ready' });
      } catch (error) {
        set({ status: 'error', errorMessage: getErrorMessage(error) });
      }
    },

    async saveRule(rule) {
      try {
        await storage.save(rule);
        set((state) => {
          const exists = state.rules.some(({ id }) => id === rule.id);
          const rules = exists
            ? state.rules.map((currentRule) =>
                currentRule.id === rule.id ? rule : currentRule,
              )
            : [...state.rules, rule];

          return { rules, status: 'ready', errorMessage: null };
        });
      } catch (error) {
        set({ status: 'error', errorMessage: getErrorMessage(error) });
      }
    },

    async removeRule(ruleId) {
      try {
        await storage.remove(ruleId);
        set((state) => ({
          rules: state.rules.filter(({ id }) => id !== ruleId),
          status: 'ready',
          errorMessage: null,
        }));
      } catch (error) {
        set({ status: 'error', errorMessage: getErrorMessage(error) });
      }
    },

    async toggleRule(ruleId, enabled) {
      const rule = get().rules.find(({ id }) => id === ruleId);

      if (!rule) {
        return;
      }

      await get().saveRule({ ...rule, enabled, updatedAt: now() });
    },
  }));
}

export type RulesStore = ReturnType<typeof createRulesStore>;
