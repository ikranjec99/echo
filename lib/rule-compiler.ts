import type { Browser } from 'wxt/browser';
import type { InterceptorRule } from '../types/rules';

type BrowserRule = Browser.declarativeNetRequest.Rule;

export const REQUEST_RESOURCE_TYPES: NonNullable<
  BrowserRule['condition']['resourceTypes']
> = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
];

function compileAction(
  action: InterceptorRule['action'],
): BrowserRule['action'] {
  if (action.type === 'block') {
    return { type: 'block' };
  }

  if (action.type === 'modifyQuery') {
    return {
      type: 'redirect',
      redirect: {
        transform: {
          queryTransform: {
            addOrReplaceParams: action.addOrReplaceParams,
            removeParams: action.removeParams,
          },
        },
      },
    };
  }

  if (action.type === 'modifyRequestHeaders') {
    return {
      type: 'modifyHeaders',
      requestHeaders: action.requestHeaders,
    };
  }

  if (action.type === 'modifyResponseHeaders') {
    return {
      type: 'modifyHeaders',
      responseHeaders: action.responseHeaders,
    };
  }

  if (action.type === 'redirect') {
    return {
      type: 'redirect',
      redirect: { url: action.targetUrl },
    };
  }

  throw new Error('CSS injection actions cannot be compiled as DNR rules.');
}

export function compileRules(rules: InterceptorRule[]): BrowserRule[] {
  return rules.flatMap((rule, index) => {
    if (!rule.enabled || rule.action.type === 'injectCss') {
      return [];
    }

    return [
      {
        id: index + 1,
        priority: 1,
        action: compileAction(rule.action),
        condition: {
          urlFilter: rule.urlPattern,
          resourceTypes: REQUEST_RESOURCE_TYPES,
        },
      },
    ];
  });
}
