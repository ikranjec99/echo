import type { InterceptorRule } from '../types/rules';

const ECHO_USER_SCRIPT_PREFIX = 'echo-';

export const USER_SCRIPT_CSP =
  "default-src 'none'; script-src 'self'; connect-src 'none'; object-src 'none'";

export type RegisteredUserScript = {
  id: string;
};

export type UserScriptRegistration = {
  id: string;
  matches: string[];
  js: Array<{ code: string }>;
  runAt: 'document_idle';
  world: 'USER_SCRIPT';
};

export type UserScriptsApi = {
  getScripts(): Promise<RegisteredUserScript[]>;
  unregister(filter: { ids: string[] }): Promise<void>;
  register(scripts: UserScriptRegistration[]): Promise<void>;
  configureWorld?(properties: {
    csp: string;
    messaging: false;
  }): Promise<void>;
};

export function compileUserScripts(
  rules: InterceptorRule[],
  interceptionEnabled: boolean,
): UserScriptRegistration[] {
  if (!interceptionEnabled) {
    return [];
  }

  return rules.flatMap((rule) =>
    rule.enabled && rule.action.type === 'injectJavaScript'
      ? [
          {
            id: `${ECHO_USER_SCRIPT_PREFIX}${rule.id}`,
            matches: [rule.urlPattern],
            js: [{ code: rule.action.script }],
            runAt: 'document_idle' as const,
            world: 'USER_SCRIPT' as const,
          },
        ]
      : [],
  );
}

export async function synchronizeUserScripts(
  rules: InterceptorRule[],
  interceptionEnabled: boolean,
  api: UserScriptsApi,
): Promise<void> {
  const installedScripts = await api.getScripts();
  const echoScriptIds = installedScripts
    .map(({ id }) => id)
    .filter((id) => id.startsWith(ECHO_USER_SCRIPT_PREFIX));

  if (echoScriptIds.length > 0) {
    await api.unregister({ ids: echoScriptIds });
  }

  const scripts = compileUserScripts(rules, interceptionEnabled);

  if (scripts.length === 0) {
    return;
  }

  if (api.configureWorld) {
    await api.configureWorld({ csp: USER_SCRIPT_CSP, messaging: false });
  }

  await api.register(scripts);
}
