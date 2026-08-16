import {
  DELAY_CONFIG_EVENT,
  DELAY_READY_EVENT,
  findRequestDelay,
  type ActiveDelayRule,
} from '../lib/request-delay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    let rules: ActiveDelayRule[] = [];
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const requestUrls = new WeakMap<XMLHttpRequest, string>();

    window.addEventListener(DELAY_CONFIG_EVENT, (event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') {
        return;
      }

      try {
        const nextRules = JSON.parse(event.detail) as unknown;
        if (Array.isArray(nextRules)) {
          rules = nextRules.filter(
            (rule): rule is ActiveDelayRule =>
              !!rule &&
              typeof rule === 'object' &&
              typeof (rule as ActiveDelayRule).requestPattern === 'string' &&
              typeof (rule as ActiveDelayRule).delayMs === 'number',
          );
        }
      } catch {
        rules = [];
      }
    });

    window.dispatchEvent(new Event(DELAY_READY_EVENT));

    window.fetch = async function echoDelayedFetch(input, init) {
      const url =
        input instanceof Request
          ? input.url
          : new URL(String(input), window.location.href).href;
      const delayMs = findRequestDelay(rules, url);

      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      return originalFetch.call(this, input, init);
    };

    XMLHttpRequest.prototype.open = function echoDelayedOpen(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ) {
      requestUrls.set(this, new URL(String(url), window.location.href).href);

      if (async === undefined) {
        Reflect.apply(originalOpen, this, [method, url]);
        return;
      }

      return originalOpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function echoDelayedSend(body) {
      const delayMs = findRequestDelay(rules, requestUrls.get(this) ?? '');

      if (delayMs > 0) {
        window.setTimeout(() => originalSend.call(this, body), delayMs);
        return;
      }

      return originalSend.call(this, body);
    };
  },
});
