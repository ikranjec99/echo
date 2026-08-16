import { createStore } from 'zustand/vanilla';

type EditorState = {
  editingRuleId: string | null;
  closeEditor(): void;
  createRule(): void;
  editRule(ruleId: string): void;
};

export const editorStore = createStore<EditorState>()((set) => ({
  editingRuleId: null,
  closeEditor: () => set({ editingRuleId: null }),
  createRule: () => set({ editingRuleId: null }),
  editRule: (editingRuleId) => set({ editingRuleId }),
}));
