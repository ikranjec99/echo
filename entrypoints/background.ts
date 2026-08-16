import { browser } from 'wxt/browser';
import {
  createInterceptionStorage,
  INTERCEPTION_ENABLED_STORAGE_KEY,
} from '../lib/interception-storage';
import { createRuleStorage } from '../lib/rule-storage';
import { synchronizeDynamicRules } from '../lib/rule-sync';
import {
  synchronizeUserScripts,
  type UserScriptsApi,
} from '../lib/user-script-sync';

export default defineBackground(() => {
  const ruleStorage = createRuleStorage();
  const interceptionStorage = createInterceptionStorage();
  let pendingSync = Promise.resolve();

  function requestRuleSync() {
    pendingSync = pendingSync
      .then(async () => {
        const interceptionEnabled = await interceptionStorage.getEnabled();
        const rules = await ruleStorage.list();

        await Promise.all([
          synchronizeDynamicRules(
            { list: async () => rules },
            browser.declarativeNetRequest,
            interceptionEnabled,
          ),
          synchronizeUserScriptRules(rules, interceptionEnabled),
        ]);
      })
      .catch((error: unknown) => {
        console.error('Echo could not synchronize request rules.', error);
      });
  }

  async function synchronizeUserScriptRules(
    rules: Awaited<ReturnType<typeof ruleStorage.list>>,
    interceptionEnabled: boolean,
  ) {
    const api = browser.userScripts as UserScriptsApi | undefined;

    if (!api) {
      return;
    }

    try {
      await synchronizeUserScripts(rules, interceptionEnabled, api);
    } catch (error) {
      console.warn(
        'Echo could not synchronize user scripts. Enable “Allow User Scripts” in the extension details and reload Echo.',
        error,
      );
    }
  }

  browser.runtime.onInstalled.addListener(requestRuleSync);
  browser.runtime.onStartup.addListener(requestRuleSync);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === 'local' &&
      (changes.rules || changes[INTERCEPTION_ENABLED_STORAGE_KEY])
    ) {
      requestRuleSync();
    }
  });

  requestRuleSync();
});
