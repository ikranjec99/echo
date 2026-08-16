export type RuleAction =
  | { type: 'block' }
  | { type: 'redirect'; targetUrl: string };

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
