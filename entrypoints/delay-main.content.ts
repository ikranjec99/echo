import {
  DELAY_CONFIG_EVENT,
  DELAY_READY_EVENT,
  findRequestDelay,
  type ActiveDelayRule,
} from '../lib/request-delay';
import {
  findMockResponse,
  MOCK_CONFIG_EVENT,
  type ActiveMockRule,
} from '../lib/response-mock';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    let rules: ActiveDelayRule[] = [];
    let mockRules: ActiveMockRule[] = [];
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

    window.addEventListener(MOCK_CONFIG_EVENT, (event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') {
        return;
      }

      try {
        const nextRules = JSON.parse(event.detail) as unknown;
        if (Array.isArray(nextRules)) {
          mockRules = nextRules.filter(
            (rule): rule is ActiveMockRule =>
              !!rule &&
              typeof rule === 'object' &&
              typeof (rule as ActiveMockRule).requestPattern === 'string' &&
              typeof (rule as ActiveMockRule).statusCode === 'number' &&
              typeof (rule as ActiveMockRule).responseBody === 'string',
          );
        }
      } catch {
        mockRules = [];
      }
    });

    window.dispatchEvent(new Event(DELAY_READY_EVENT));

    window.fetch = async function echoDelayedFetch(input, init) {
      const url =
        input instanceof Request
          ? input.url
          : new URL(String(input), window.location.href).href;
      const mock = findMockResponse(mockRules, url);

      if (mock) {
        return new Response(mock.responseBody, {
          status: mock.statusCode,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-echo-mock': 'true',
          },
        });
      }

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
      const requestUrl = requestUrls.get(this) ?? '';
      const mock = findMockResponse(mockRules, requestUrl);

      if (mock) {
        const responseValue =
          this.responseType === 'json'
            ? JSON.parse(mock.responseBody)
            : this.responseType === 'blob'
              ? new Blob([mock.responseBody], { type: 'application/json' })
              : this.responseType === 'arraybuffer'
                ? new TextEncoder().encode(mock.responseBody).buffer
                : this.responseType === 'document'
                  ? null
                  : mock.responseBody;

        Object.defineProperties(this, {
          readyState: { configurable: true, get: () => 4 },
          status: { configurable: true, get: () => mock.statusCode },
          statusText: { configurable: true, get: () => 'Echo Mock' },
          responseURL: { configurable: true, get: () => requestUrl },
          response: { configurable: true, get: () => responseValue },
          responseText: {
            configurable: true,
            get: () => {
              if (this.responseType && this.responseType !== 'text') {
                throw new DOMException(
                  'The responseText is only available for text responses.',
                  'InvalidStateError',
                );
              }
              return mock.responseBody;
            },
          },
          responseXML: { configurable: true, get: () => null },
          getAllResponseHeaders: {
            configurable: true,
            value: () =>
              'content-type: application/json; charset=utf-8\r\nx-echo-mock: true\r\n',
          },
          getResponseHeader: {
            configurable: true,
            value: (name: string) => {
              const normalizedName = name.toLowerCase();
              if (normalizedName === 'content-type') {
                return 'application/json; charset=utf-8';
              }
              return normalizedName === 'x-echo-mock' ? 'true' : null;
            },
          },
        });

        this.dispatchEvent(new ProgressEvent('loadstart'));
        window.setTimeout(() => {
          this.dispatchEvent(new Event('readystatechange'));
          this.dispatchEvent(new ProgressEvent('load'));
          this.dispatchEvent(new ProgressEvent('loadend'));
        }, 0);
        return;
      }

      const delayMs = findRequestDelay(rules, requestUrl);

      if (delayMs > 0) {
        window.setTimeout(() => originalSend.call(this, body), delayMs);
        return;
      }

      return originalSend.call(this, body);
    };
  },
});
