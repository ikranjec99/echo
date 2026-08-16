import { createRuleStorage } from '../../lib/rule-storage';
import { createRulesStore } from '../../store/rules-store';

export const rulesStore = createRulesStore({
  storage: createRuleStorage(),
});
