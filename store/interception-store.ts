import { createStore } from 'zustand/vanilla';
import type { InterceptionStorage } from '../lib/interception-storage';

export type InterceptionStatus = 'idle' | 'loading' | 'ready' | 'error';

export type InterceptionState = {
  enabled: boolean;
  status: InterceptionStatus;
  errorMessage: string | null;
  loadEnabled(): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function createInterceptionStore(storage: InterceptionStorage) {
  return createStore<InterceptionState>()((set) => ({
    enabled: true,
    status: 'idle',
    errorMessage: null,

    async loadEnabled() {
      set({ status: 'loading', errorMessage: null });

      try {
        const enabled = await storage.getEnabled();
        set({ enabled, status: 'ready' });
      } catch (error) {
        set({ status: 'error', errorMessage: getErrorMessage(error) });
      }
    },

    async setEnabled(enabled) {
      try {
        await storage.setEnabled(enabled);
        set({ enabled, status: 'ready', errorMessage: null });
      } catch (error) {
        set({ status: 'error', errorMessage: getErrorMessage(error) });
      }
    },
  }));
}

export type InterceptionStore = ReturnType<typeof createInterceptionStore>;
