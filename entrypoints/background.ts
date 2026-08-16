import { browser } from 'wxt/browser';
import { createRuleStorage } from '../lib/rule-storage';
import { synchronizeDynamicRules } from '../lib/rule-sync';

export default defineBackground(() => {
  const ruleStorage = createRuleStorage();
  let pendingSync = Promise.resolve();

  function requestRuleSync() {
    pendingSync = pendingSync
      .then(() =>
        synchronizeDynamicRules(
          ruleStorage,
          browser.declarativeNetRequest,
        ),
      )
      .catch((error: unknown) => {
        console.error('Echo could not synchronize request rules.', error);
      });
  }

  browser.runtime.onInstalled.addListener(requestRuleSync);
  browser.runtime.onStartup.addListener(requestRuleSync);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.rules) {
      requestRuleSync();
    }
  });

  requestRuleSync();
});
