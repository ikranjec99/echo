import type { Browser } from 'wxt/browser';
import { compileRules } from './rule-compiler';
import type { InterceptorRule } from '../types/rules';

type BrowserRule = Browser.declarativeNetRequest.Rule;

export type RuleSource = {
  list(): Promise<InterceptorRule[]>;
};

export type DynamicRulesApi = {
  getDynamicRules(): Promise<BrowserRule[]>;
  updateDynamicRules(options: {
    addRules?: BrowserRule[];
    removeRuleIds?: number[];
  }): Promise<void>;
};

export async function synchronizeDynamicRules(
  ruleSource: RuleSource,
  dynamicRulesApi: DynamicRulesApi,
): Promise<void> {
  const [storedRules, installedRules] = await Promise.all([
    ruleSource.list(),
    dynamicRulesApi.getDynamicRules(),
  ]);

  await dynamicRulesApi.updateDynamicRules({
    removeRuleIds: installedRules.map(({ id }) => id),
    addRules: compileRules(storedRules),
  });
}
