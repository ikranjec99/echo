import { browser } from 'wxt/browser';
import {
  createInterceptionStorage,
  INTERCEPTION_ENABLED_STORAGE_KEY,
} from '../lib/interception-storage';
import { createRuleStorage } from '../lib/rule-storage';
import { synchronizeDynamicRules } from '../lib/rule-sync';

export default defineBackground(() => {
  const ruleStorage = createRuleStorage();
  const interceptionStorage = createInterceptionStorage();
  let pendingSync = Promise.resolve();

  function requestRuleSync() {
    pendingSync = pendingSync
      .then(async () => {
        const interceptionEnabled = await interceptionStorage.getEnabled();

        await synchronizeDynamicRules(
          ruleStorage,
          browser.declarativeNetRequest,
          interceptionEnabled,
        );
      })
      .catch((error: unknown) => {
        console.error('Echo could not synchronize request rules.', error);
      });
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
