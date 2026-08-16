import { createInterceptionStorage } from '../lib/interception-storage';
import { getCssInjections } from '../lib/css-injection';
import { createRuleStorage } from '../lib/rule-storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const ruleStorage = createRuleStorage();
    const interceptionStorage = createInterceptionStorage();

    async function applyCssRules() {
      document.querySelectorAll('style[data-echo-rule-id]').forEach((style) => {
        style.remove();
      });

      const [rules, interceptionEnabled] = await Promise.all([
        ruleStorage.list(),
        interceptionStorage.getEnabled(),
      ]);

      for (const injection of getCssInjections(
        rules,
        interceptionEnabled,
        window.location.href,
      )) {
        const style = document.createElement('style');
        style.dataset.echoRuleId = injection.ruleId;
        style.textContent = injection.css;
        (document.head ?? document.documentElement).append(style);
      }
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (
        areaName === 'local' &&
        (changes.rules || changes.interceptionEnabled)
      ) {
        void applyCssRules();
      }
    });

    void applyCssRules();
  },
});
