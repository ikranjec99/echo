import { describe, expect, it, vi } from 'vitest';
import {
  createInterceptionStorage,
  INTERCEPTION_ENABLED_STORAGE_KEY,
} from '../lib/interception-storage';
import type { RuleStorageArea } from '../lib/rule-storage';

function createStorageArea(value?: unknown): RuleStorageArea {
  return {
    get: vi.fn().mockResolvedValue(
      value === undefined ? {} : { [INTERCEPTION_ENABLED_STORAGE_KEY]: value },
    ),
    set: vi.fn().mockResolvedValue(undefined),
  };
}

describe('createInterceptionStorage', () => {
  it('defaults interception to enabled', async () => {
    const storage = createInterceptionStorage(createStorageArea());

    await expect(storage.getEnabled()).resolves.toBe(true);
  });

  it('reads a persisted paused state', async () => {
    const storage = createInterceptionStorage(createStorageArea(false));

    await expect(storage.getEnabled()).resolves.toBe(false);
  });

  it('persists the global state', async () => {
    const storageArea = createStorageArea();
    const storage = createInterceptionStorage(storageArea);

    await storage.setEnabled(false);

    expect(storageArea.set).toHaveBeenCalledWith({
      [INTERCEPTION_ENABLED_STORAGE_KEY]: false,
    });
  });
});
