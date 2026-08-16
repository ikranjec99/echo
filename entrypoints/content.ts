import { createInterceptionStorage } from '../lib/interception-storage';
import { getCssInjections } from '../lib/css-injection';
import { createRuleStorage } from '../lib/rule-storage';
import {
  DELAY_CONFIG_EVENT,
  DELAY_READY_EVENT,
  getDelayRulesForPage,
} from '../lib/request-delay';

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

      window.dispatchEvent(
        new CustomEvent(DELAY_CONFIG_EVENT, {
          detail: JSON.stringify(
            getDelayRulesForPage(
              rules,
              interceptionEnabled,
              window.location.href,
            ),
          ),
        }),
      );
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (
        areaName === 'local' &&
        (changes.rules || changes.interceptionEnabled)
      ) {
        void applyCssRules();
      }
    });

    window.addEventListener(DELAY_READY_EVENT, () => {
      void applyCssRules();
    });

    void applyCssRules();
  },
});
