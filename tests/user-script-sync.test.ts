import { describe, expect, it, vi } from 'vitest';
import {
  compileUserScripts,
  synchronizeUserScripts,
  USER_SCRIPT_CSP,
  type UserScriptsApi,
} from '../lib/user-script-sync';
import type { InterceptorRule } from '../types/rules';

function createScriptRule(
  overrides: Partial<InterceptorRule> = {},
): InterceptorRule {
  return {
    id: 'script-rule',
    name: 'Mark staging',
    enabled: true,
    urlPattern: '*://*.example.com/*',
    action: {
      type: 'injectJavaScript',
      script: 'document.body.dataset.echo = "active";',
    },
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

function createApi(): UserScriptsApi {
  return {
    getScripts: vi.fn().mockResolvedValue([
      { id: 'echo-old-rule' },
      { id: 'another-extension-script' },
    ]),
    unregister: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    configureWorld: vi.fn().mockResolvedValue(undefined),
  };
}

describe('user script synchronization', () => {
  it('compiles enabled rules into the isolated user-script world', () => {
    expect(compileUserScripts([createScriptRule()], true)).toEqual([
      {
        id: 'echo-script-rule',
        matches: ['*://*.example.com/*'],
        js: [{ code: 'document.body.dataset.echo = "active";' }],
        runAt: 'document_idle',
        world: 'USER_SCRIPT',
      },
    ]);
  });

  it('does not compile scripts while Echo is paused', () => {
    expect(compileUserScripts([createScriptRule()], false)).toEqual([]);
  });

  it('replaces only Echo-managed scripts and configures safeguards', async () => {
    const api = createApi();

    await synchronizeUserScripts([createScriptRule()], true, api);

    expect(api.unregister).toHaveBeenCalledWith({ ids: ['echo-old-rule'] });
    expect(api.configureWorld).toHaveBeenCalledWith({
      csp: USER_SCRIPT_CSP,
      messaging: false,
    });
    expect(api.register).toHaveBeenCalledOnce();
  });

  it('removes registered scripts without adding them while paused', async () => {
    const api = createApi();

    await synchronizeUserScripts([createScriptRule()], false, api);

    expect(api.unregister).toHaveBeenCalledWith({ ids: ['echo-old-rule'] });
    expect(api.register).not.toHaveBeenCalled();
  });
});
