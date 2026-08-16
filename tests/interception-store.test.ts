import { describe, expect, it, vi } from 'vitest';
import type { InterceptionStorage } from '../lib/interception-storage';
import { createInterceptionStore } from '../store/interception-store';

function createStorage(enabled = true): InterceptionStorage {
  return {
    getEnabled: vi.fn().mockResolvedValue(enabled),
    setEnabled: vi.fn().mockResolvedValue(undefined),
  };
}

describe('createInterceptionStore', () => {
  it('loads the persisted state', async () => {
    const store = createInterceptionStore(createStorage(false));

    await store.getState().loadEnabled();

    expect(store.getState()).toMatchObject({
      enabled: false,
      status: 'ready',
      errorMessage: null,
    });
  });

  it('persists and exposes state changes', async () => {
    const storage = createStorage();
    const store = createInterceptionStore(storage);

    await store.getState().setEnabled(false);

    expect(storage.setEnabled).toHaveBeenCalledWith(false);
    expect(store.getState()).toMatchObject({ enabled: false, status: 'ready' });
  });

  it('keeps the current state and exposes persistence failures', async () => {
    const storage = createStorage();
    vi.mocked(storage.setEnabled).mockRejectedValue(new Error('Storage failed'));
    const store = createInterceptionStore(storage);

    await store.getState().setEnabled(false);

    expect(store.getState()).toMatchObject({
      enabled: true,
      status: 'error',
      errorMessage: 'Storage failed',
    });
  });
});
