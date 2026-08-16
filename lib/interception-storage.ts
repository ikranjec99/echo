import { browser } from 'wxt/browser';
import type { RuleStorageArea } from './rule-storage';

export const INTERCEPTION_ENABLED_STORAGE_KEY = 'interceptionEnabled';

export type InterceptionStorage = {
  getEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
};

export function createInterceptionStorage(
  storageArea: RuleStorageArea = browser.storage.local,
): InterceptionStorage {
  return {
    async getEnabled() {
      const stored = await storageArea.get(INTERCEPTION_ENABLED_STORAGE_KEY);
      const enabled = stored[INTERCEPTION_ENABLED_STORAGE_KEY];

      return typeof enabled === 'boolean' ? enabled : true;
    },

    async setEnabled(enabled) {
      await storageArea.set({ [INTERCEPTION_ENABLED_STORAGE_KEY]: enabled });
    },
  };
}
