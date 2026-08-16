import { useEffect, useRef, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { validateRuleDraft } from '../../lib/rule-validation';
import {
  formatAddOrReplaceParams,
  formatRemoveParams,
  parseAddOrReplaceParams,
  parseRemoveParams,
} from '../../lib/query-parameters';
import type { InterceptorRule, RuleDraft } from '../../types/rules';
import { editorStore } from './editor-store';
import { interceptionStore } from './interception-store';
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
  const {
    enabled: interceptionEnabled,
    errorMessage: interceptionErrorMessage,
    loadEnabled: loadInterceptionEnabled,
    setEnabled: setInterceptionEnabled,
    status: interceptionStatus,
  } = useStore(interceptionStore);

  useEffect(() => {
    void loadRules();
    void loadInterceptionEnabled();
  }, [loadInterceptionEnabled, loadRules]);

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
    const action =
      actionType === 'redirect'
        ? {
            type: 'redirect' as const,
            targetUrl: String(formData.get('targetUrl') ?? '').trim(),
          }
        : actionType === 'modifyQuery'
          ? {
              type: 'modifyQuery' as const,
              addOrReplaceParams: parseAddOrReplaceParams(
                String(formData.get('addOrReplaceParams') ?? ''),
              ),
              removeParams: parseRemoveParams(
                String(formData.get('removeParams') ?? ''),
              ),
            }
          : { type: 'block' as const };
    const draft: RuleDraft = {
      name: String(formData.get('name') ?? '').trim(),
      enabled: true,
      urlPattern: String(formData.get('urlPattern') ?? '').trim(),
      action,
    };
    const errors = validateRuleDraft(draft);
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const urlPatternInput = form.elements.namedItem(
      'urlPattern',
    ) as HTMLInputElement;
    const targetUrlInput = form.elements.namedItem(
      'targetUrl',
    ) as HTMLInputElement;
    const addOrReplaceParamsInput = form.elements.namedItem(
      'addOrReplaceParams',
    ) as HTMLTextAreaElement;
    const removeParamsInput = form.elements.namedItem(
      'removeParams',
    ) as HTMLTextAreaElement;

    nameInput.setCustomValidity(errors.name ?? '');
    urlPatternInput.setCustomValidity(errors.urlPattern ?? '');
    targetUrlInput.setCustomValidity(errors.targetUrl ?? '');
    addOrReplaceParamsInput.setCustomValidity(errors.queryParams ?? '');
    removeParamsInput.setCustomValidity(errors.queryParams ?? '');

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

      <section
        className={`interception-control ${interceptionEnabled ? 'is-active' : 'is-paused'}`}
        aria-labelledby="interception-status"
      >
        <div>
          <p className="interception-label" id="interception-status">
            Echo is {interceptionEnabled ? 'active' : 'paused'}
          </p>
          <p className="interception-description">
            {interceptionEnabled
              ? 'Enabled rules are applied to browser requests.'
              : 'All rules are temporarily inactive.'}
          </p>
        </div>

        <label className="switch master-switch">
          <span className="sr-only">
            {interceptionEnabled ? 'Pause' : 'Resume'} Echo
          </span>
          <input
            type="checkbox"
            checked={interceptionEnabled}
            disabled={interceptionStatus === 'loading'}
            onChange={(event) =>
              void setInterceptionEnabled(event.currentTarget.checked)
            }
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
      </section>

      {(errorMessage || interceptionErrorMessage) && (
        <p className="error-banner" role="alert">
          {errorMessage || interceptionErrorMessage}
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
                  {rule.action.type === 'modifyQuery' && (
                    <p className="redirect-target">
                      {rule.action.addOrReplaceParams.length} set ·{' '}
                      {rule.action.removeParams.length} removed
                    </p>
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
              <option value="modifyQuery">Modify query parameters</option>
            </select>
          </label>

          <label className="field">
            <span>Add or replace query parameters</span>
            <textarea
              name="addOrReplaceParams"
              placeholder={'environment=staging\ndebug=true'}
              defaultValue={
                editingRule?.action.type === 'modifyQuery'
                  ? formatAddOrReplaceParams(
                      editingRule.action.addOrReplaceParams,
                    )
                  : ''
              }
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
            <small>One name=value pair per line. Values may be empty.</small>
          </label>

          <label className="field">
            <span>Remove query parameters</span>
            <textarea
              name="removeParams"
              placeholder={'utm_source\nutm_campaign'}
              defaultValue={
                editingRule?.action.type === 'modifyQuery'
                  ? formatRemoveParams(editingRule.action.removeParams)
                  : ''
              }
              onInput={(event) => event.currentTarget.setCustomValidity('')}
            />
            <small>One parameter name per line.</small>
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
