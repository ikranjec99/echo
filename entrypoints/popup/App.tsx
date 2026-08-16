import { useEffect, useRef, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { validateRuleDraft } from '../../lib/rule-validation';
import type { InterceptorRule, RuleDraft } from '../../types/rules';
import { editorStore } from './editor-store';
import { rulesStore } from './rules-store';

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { closeEditor, createRule, editingRuleId, editRule } =
    useStore(editorStore);
  const {
    errorMessage,
    loadRules,
    removeRule,
    rules,
    saveRule,
    status,
    toggleRule,
  } = useStore(rulesStore);
  const editingRule = rules.find(({ id }) => id === editingRuleId);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  function openRuleDialog() {
    createRule();
    dialogRef.current?.showModal();
  }

  function closeRuleDialog() {
    dialogRef.current?.close();
    closeEditor();
  }

  function openEditDialog(ruleId: string) {
    editRule(ruleId);
    dialogRef.current?.showModal();
  }

  async function handleDelete(rule: InterceptorRule) {
    const confirmed = window.confirm(
      `Delete “${rule.name}”? This cannot be undone.`,
    );

    if (confirmed) {
      await removeRule(rule.id);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const actionType = formData.get('action');
    const draft: RuleDraft = {
      name: String(formData.get('name') ?? '').trim(),
      enabled: true,
      urlPattern: String(formData.get('urlPattern') ?? '').trim(),
      action:
        actionType === 'redirect'
          ? {
              type: 'redirect',
              targetUrl: String(formData.get('targetUrl') ?? '').trim(),
            }
          : { type: 'block' },
    };
    const errors = validateRuleDraft(draft);
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const urlPatternInput = form.elements.namedItem(
      'urlPattern',
    ) as HTMLInputElement;
    const targetUrlInput = form.elements.namedItem(
      'targetUrl',
    ) as HTMLInputElement;

    nameInput.setCustomValidity(errors.name ?? '');
    urlPatternInput.setCustomValidity(errors.urlPattern ?? '');
    targetUrlInput.setCustomValidity(errors.targetUrl ?? '');

    if (!form.reportValidity()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const rule: InterceptorRule = editingRule
      ? {
          ...editingRule,
          ...draft,
          updatedAt: timestamp,
        }
      : {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
        };

    await saveRule(rule);

    if (rulesStore.getState().status === 'error') {
      return;
    }

    form.reset();
    closeRuleDialog();
  }

  return (
    <main className="popup">
      <header className="app-header">
        <div>
          <p className="eyebrow">HTTP request interceptor</p>
          <h1>Echo</h1>
        </div>

        {rules.length > 0 && (
          <button className="primary-button compact-button" onClick={openRuleDialog}>
            Add rule
          </button>
        )}
      </header>

      {errorMessage && (
        <p className="error-banner" role="alert">
          {errorMessage}
        </p>
      )}

      {status === 'loading' && <p className="loading-state">Loading rules…</p>}

      {status !== 'loading' && rules.length === 0 && (
        <section className="empty-state" aria-labelledby="empty-state-title">
          <h2 id="empty-state-title">No rules yet</h2>
          <p>Create your first rule to block or redirect a request.</p>
          <button className="primary-button" type="button" onClick={openRuleDialog}>
            Add rule
          </button>
        </section>
      )}

      {rules.length > 0 && (
        <section aria-labelledby="rules-title">
          <div className="section-heading">
            <h2 id="rules-title">Rules</h2>
            <span>{rules.length}</span>
          </div>

          <ul className="rule-list">
            {rules.map((rule) => (
              <li className="rule-card" key={rule.id}>
                <div className="rule-copy">
                  <div className="rule-title-row">
                    <h3>{rule.name}</h3>
                    <span className={`rule-type rule-type-${rule.action.type}`}>
                      {rule.action.type}
                    </span>
                  </div>
                  <code>{rule.urlPattern}</code>
                  {rule.action.type === 'redirect' && (
                    <p className="redirect-target">→ {rule.action.targetUrl}</p>
                  )}
                </div>

                <div className="rule-controls">
                  <label className="switch">
                    <span className="sr-only">
                      {rule.enabled ? 'Disable' : 'Enable'} {rule.name}
                    </span>
                    <span
                      className={`switch-status ${rule.enabled ? 'is-enabled' : ''}`}
                      aria-hidden="true"
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) =>
                        void toggleRule(rule.id, event.currentTarget.checked)
                      }
                    />
                    <span className="switch-track" aria-hidden="true" />
                  </label>

                  <div className="rule-actions">
                    <button type="button" onClick={() => openEditDialog(rule.id)}>
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => void handleDelete(rule)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dialog className="rule-dialog" ref={dialogRef}>
        <form
          key={editingRuleId ?? 'new-rule'}
          method="dialog"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">
                {editingRule ? 'Update interceptor' : 'New interceptor'}
              </p>
              <h2>{editingRule ? 'Edit rule' : 'Add rule'}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close rule editor"
              onClick={closeRuleDialog}
            >
              ×
            </button>
          </div>

          <label className="field">
            <span>Name</span>
            <input
              name="name"
              placeholder="Block analytics"
              defaultValue={editingRule?.name}
              autoComplete="off"
              required
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
          </label>

          <label className="field">
            <span>URL pattern</span>
            <input
              name="urlPattern"
              placeholder="||analytics.example.com^"
              defaultValue={editingRule?.urlPattern}
              autoComplete="off"
              required
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
            <small>Uses Chrome URL filter syntax.</small>
          </label>

          <label className="field">
            <span>Action</span>
            <select
              name="action"
              defaultValue={editingRule?.action.type ?? 'block'}
            >
              <option value="block">Block request</option>
              <option value="redirect">Redirect request</option>
            </select>
          </label>

          <label className="field">
            <span>Redirect URL</span>
            <input
              name="targetUrl"
              type="url"
              placeholder="http://localhost:3000"
              defaultValue={
                editingRule?.action.type === 'redirect'
                  ? editingRule.action.targetUrl
                  : ''
              }
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
            <small>Required only when the action is Redirect.</small>
          </label>

          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={closeRuleDialog}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {editingRule ? 'Save changes' : 'Save rule'}
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
