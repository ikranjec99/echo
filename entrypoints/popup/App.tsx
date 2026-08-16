import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from 'zustand';
import { validateRuleDraft } from '../../lib/rule-validation';
import {
  formatAddOrReplaceParams,
  formatRemoveParams,
  parseAddOrReplaceParams,
  parseRemoveParams,
} from '../../lib/query-parameters';
import {
  formatRemoveRequestHeaders,
  formatSetRequestHeaders,
  parseRemoveRequestHeaders,
  parseSetRequestHeaders,
} from '../../lib/request-headers';
import type { InterceptorRule, RuleDraft } from '../../types/rules';
import { editorStore } from './editor-store';
import { interceptionStore } from './interception-store';
import { rulesStore } from './rules-store';

type RuleActionType = InterceptorRule['action']['type'];

const ACTION_OPTIONS: Array<{
  type: RuleActionType;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    type: 'block',
    icon: '⊘',
    title: 'Block request',
    description: 'Stop matching requests before they are sent.',
  },
  {
    type: 'redirect',
    icon: '↗',
    title: 'Redirect request',
    description: 'Send matching requests to another URL.',
  },
  {
    type: 'modifyQuery',
    icon: '?',
    title: 'Query parameters',
    description: 'Add, replace, or remove URL parameters.',
  },
  {
    type: 'modifyRequestHeaders',
    icon: '≡',
    title: 'Request headers',
    description: 'Set or remove outgoing HTTP headers.',
  },
];

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedActionType, setSelectedActionType] =
    useState<RuleActionType | null>(null);
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
    setSelectedActionType(null);
    dialogRef.current?.showModal();
  }

  function closeRuleDialog() {
    dialogRef.current?.close();
    closeEditor();
    setSelectedActionType(null);
  }

  function openEditDialog(ruleId: string) {
    const rule = rules.find(({ id }) => id === ruleId);
    editRule(ruleId);
    setSelectedActionType(rule?.action.type ?? 'block');
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
    const actionType = selectedActionType;
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
          : actionType === 'modifyRequestHeaders'
            ? {
                type: 'modifyRequestHeaders' as const,
                requestHeaders: [
                  ...parseSetRequestHeaders(
                    String(formData.get('setRequestHeaders') ?? ''),
                  ),
                  ...parseRemoveRequestHeaders(
                    String(formData.get('removeRequestHeaders') ?? ''),
                  ),
                ],
              }
            : { type: 'block' as const };
    const draft: RuleDraft = {
      name: String(formData.get('name') ?? '').trim(),
      enabled: editingRule?.enabled ?? true,
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
    const setRequestHeadersInput = form.elements.namedItem(
      'setRequestHeaders',
    ) as HTMLTextAreaElement;
    const removeRequestHeadersInput = form.elements.namedItem(
      'removeRequestHeaders',
    ) as HTMLTextAreaElement;

    nameInput.setCustomValidity(errors.name ?? '');
    urlPatternInput.setCustomValidity(errors.urlPattern ?? '');
    targetUrlInput?.setCustomValidity(errors.targetUrl ?? '');
    addOrReplaceParamsInput?.setCustomValidity(errors.queryParams ?? '');
    removeParamsInput?.setCustomValidity(errors.queryParams ?? '');
    setRequestHeadersInput?.setCustomValidity(errors.requestHeaders ?? '');
    removeRequestHeadersInput?.setCustomValidity(errors.requestHeaders ?? '');

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
                  {rule.action.type === 'modifyRequestHeaders' && (
                    <p className="redirect-target">
                      {rule.action.requestHeaders.filter(
                        ({ operation }) => operation === 'set',
                      ).length}{' '}
                      set ·{' '}
                      {rule.action.requestHeaders.filter(
                        ({ operation }) => operation === 'remove',
                      ).length}{' '}
                      removed
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
          key={`${editingRuleId ?? 'new-rule'}-${selectedActionType ?? 'choose'}`}
          method="dialog"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">Rule editor</p>
              <h2>
                {selectedActionType
                  ? editingRule
                    ? 'Edit rule'
                    : 'Configure rule'
                  : 'Choose interceptor type'}
              </h2>
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

          {!selectedActionType ? (
            <>
              <p className="action-picker-intro">
                What should Echo do when a request matches?
              </p>
              <div className="action-grid">
                {ACTION_OPTIONS.map((option) => (
                  <button
                    className={`action-card action-card-${option.type}`}
                    key={option.type}
                    type="button"
                    onClick={() => setSelectedActionType(option.type)}
                  >
                    <span className="action-icon" aria-hidden="true">
                      {option.icon}
                    </span>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                className="selected-action"
                type="button"
                onClick={() => setSelectedActionType(null)}
              >
                <span className="selected-action-icon" aria-hidden="true">
                  {ACTION_OPTIONS.find(
                    ({ type }) => type === selectedActionType,
                  )?.icon}
                </span>
                <span>
                  <small>Interceptor type</small>
                  <strong>
                    {ACTION_OPTIONS.find(
                      ({ type }) => type === selectedActionType,
                    )?.title}
                  </strong>
                </span>
                <span className="change-action">Change</span>
              </button>

              <label className="field">
                <span>Name</span>
                <input
                  name="name"
                  placeholder="Give this rule a clear name"
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

              {selectedActionType === 'redirect' && (
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
                    onInput={(event) =>
                      event.currentTarget.setCustomValidity('')
                    }
                  />
                  <small>Absolute HTTP or HTTPS destination.</small>
                </label>
              )}

              {selectedActionType === 'modifyQuery' && (
                <div className="action-fields">
                  <label className="field">
                    <span>Add or replace parameters</span>
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
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>One name=value pair per line.</small>
                  </label>
                  <label className="field">
                    <span>Remove parameters</span>
                    <textarea
                      name="removeParams"
                      placeholder={'utm_source\nutm_campaign'}
                      defaultValue={
                        editingRule?.action.type === 'modifyQuery'
                          ? formatRemoveParams(editingRule.action.removeParams)
                          : ''
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>One parameter name per line.</small>
                  </label>
                </div>
              )}

              {selectedActionType === 'modifyRequestHeaders' && (
                <div className="action-fields">
                  <label className="field">
                    <span>Set request headers</span>
                    <textarea
                      name="setRequestHeaders"
                      placeholder={'x-environment: staging\nx-debug: true'}
                      defaultValue={
                        editingRule?.action.type === 'modifyRequestHeaders'
                          ? formatSetRequestHeaders(
                              editingRule.action.requestHeaders,
                            )
                          : ''
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>One name: value header per line.</small>
                  </label>
                  <label className="field">
                    <span>Remove request headers</span>
                    <textarea
                      name="removeRequestHeaders"
                      placeholder={'x-client-version\nreferer'}
                      defaultValue={
                        editingRule?.action.type === 'modifyRequestHeaders'
                          ? formatRemoveRequestHeaders(
                              editingRule.action.requestHeaders,
                            )
                          : ''
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>
                      One name per line. Sensitive values are never stored.
                    </small>
                  </label>
                </div>
              )}

              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={closeRuleDialog}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  {editingRule ? 'Save changes' : 'Save rule'}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </main>
  );
}
