export type RuleAction =
  | { type: 'block' }
  | { type: 'redirect'; targetUrl: string }
  | {
      type: 'modifyQuery';
      addOrReplaceParams: QueryParameter[];
      removeParams: string[];
    }
  | {
      type: 'modifyRequestHeaders';
      requestHeaders: RequestHeaderOperation[];
    }
  | {
      type: 'modifyResponseHeaders';
      responseHeaders: ResponseHeaderOperation[];
    }
  | {
      type: 'injectCss';
      css: string;
    }
  | {
      type: 'injectJavaScript';
      script: string;
    }
  | {
      type: 'delayRequest';
      requestPattern: string;
      delayMs: number;
    }
  | {
      type: 'mockJsonResponse';
      requestPattern: string;
      statusCode: number;
      responseBody: string;
    };

export type QueryParameter = {
  key: string;
  value: string;
};

export type RequestHeaderOperation =
  | { operation: 'set'; header: string; value: string }
  | { operation: 'remove'; header: string };

export type ResponseHeaderOperation =
  | { operation: 'set'; header: string; value: string }
  | { operation: 'remove'; header: string };

export type InterceptorRule = {
  id: string;
  name: string;
  enabled: boolean;
  urlPattern: string;
  action: RuleAction;
  createdAt: string;
  updatedAt: string;
};

export type RuleDraft = Pick<
  InterceptorRule,
  'name' | 'enabled' | 'urlPattern' | 'action'
>;
