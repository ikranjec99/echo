import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useStore } from 'zustand';
import { browser } from 'wxt/browser';
import {
  parseRuleBackup,
  prepareRulesForImport,
  serializeRuleBackup,
} from '../../lib/rule-backup';
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
import {
  formatRemoveResponseHeaders,
  formatSetResponseHeaders,
  parseRemoveResponseHeaders,
  parseSetResponseHeaders,
} from '../../lib/response-headers';
import type { InterceptorRule, RuleDraft } from '../../types/rules';
import { editorStore } from './editor-store';
import { interceptionStore } from './interception-store';
import { rulesStore } from './rules-store';

type RuleActionType = InterceptorRule['action']['type'];

const ACTION_LABELS: Record<RuleActionType, string> = {
  block: 'Block',
  redirect: 'Redirect',
  modifyQuery: 'Query',
  modifyRequestHeaders: 'Request headers',
  modifyResponseHeaders: 'Response headers',
  injectCss: 'CSS',
  injectJavaScript: 'JavaScript',
  delayRequest: 'Delay',
};

function getRuleSearchText(rule: InterceptorRule): string {
  const actionDetails = (() => {
    switch (rule.action.type) {
      case 'redirect':
        return rule.action.targetUrl;
      case 'modifyQuery':
        return [
          ...rule.action.addOrReplaceParams.flatMap(({ key, value }) => [
            key,
            value,
          ]),
          ...rule.action.removeParams,
        ].join(' ');
      case 'modifyRequestHeaders':
        return rule.action.requestHeaders
          .flatMap((operation) => [
            operation.header,
            operation.operation === 'set' ? operation.value : '',
          ])
          .join(' ');
      case 'modifyResponseHeaders':
        return rule.action.responseHeaders
          .flatMap((operation) => [
            operation.header,
            operation.operation === 'set' ? operation.value : '',
          ])
          .join(' ');
      case 'injectCss':
        return rule.action.css;
      case 'injectJavaScript':
        return rule.action.script;
      case 'delayRequest':
        return `${rule.action.requestPattern} ${rule.action.delayMs}`;
      case 'block':
        return '';
    }
  })();

  return `${rule.name} ${rule.urlPattern} ${ACTION_LABELS[rule.action.type]} ${actionDetails}`.toLowerCase();
}

const ACTION_OPTIONS: Array<{
  type: RuleActionType;
  icon: string;
  title: string;
  description: string;
  experimental?: boolean;
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
  {
    type: 'modifyResponseHeaders',
    icon: '⇠',
    title: 'Response headers',
    description: 'Set or remove headers returned by a server.',
  },
  {
    type: 'injectCss',
    icon: '✦',
    title: 'Inject CSS',
    description: 'Apply local styles to matching pages.',
  },
  {
    type: 'injectJavaScript',
    icon: 'JS',
    title: 'Inject JavaScript',
    description: 'Run local code in an isolated user-script world.',
  },
  {
    type: 'delayRequest',
    icon: 'MS',
    title: 'Delay request',
    description: 'Delay matching page fetch and XHR calls.',
    experimental: true,
  },
];

export default function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const rulesScrollRef = useRef<HTMLDivElement>(null);
  const [selectedActionType, setSelectedActionType] =
    useState<RuleActionType | null>(null);
  const [userScriptsAvailable, setUserScriptsAvailable] = useState<
    boolean | null
  >(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleCategory, setRuleCategory] = useState<RuleActionType | 'all'>(
    'all',
  );
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
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
  const normalizedRuleSearch = ruleSearch.trim().toLowerCase();
  const filtersActive = normalizedRuleSearch !== '' || ruleCategory !== 'all';
  const filteredRules = rules.filter(
    (rule) =>
      (ruleCategory === 'all' || rule.action.type === ruleCategory) &&
      (!normalizedRuleSearch ||
        getRuleSearchText(rule).includes(normalizedRuleSearch)),
  );

  useEffect(() => {
    void loadRules();
    void loadInterceptionEnabled();
  }, [loadInterceptionEnabled, loadRules]);

  useEffect(() => {
    if (!backupMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setBackupMessage(null), 2_000);

    return () => window.clearTimeout(timeout);
  }, [backupMessage]);

  useEffect(() => {
    if (selectedActionType !== 'injectJavaScript') {
      setUserScriptsAvailable(null);
      return;
    }

    let active = true;

    async function checkUserScripts() {
      try {
        if (!browser.userScripts) {
          throw new Error('The userScripts API is unavailable.');
        }

        await browser.userScripts.getScripts();
        if (active) {
          setUserScriptsAvailable(true);
        }
      } catch {
        if (active) {
          setUserScriptsAvailable(false);
        }
      }
    }

    void checkUserScripts();

    return () => {
      active = false;
    };
  }, [selectedActionType]);

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

  function handleExportRules() {
    setBackupMessage(null);
    setBackupError(null);

    const contents = serializeRuleBackup(rules);
    const blobUrl = URL.createObjectURL(
      new Blob([contents], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = blobUrl;
    link.download = `echo-rules-${date}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }

  async function handleImportRules(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setBackupMessage(null);
    setBackupError(null);

    try {
      if (file.size > 5_000_000) {
        throw new Error('Rule backup files are limited to 5 MB.');
      }

      const importedRules = prepareRulesForImport(
        parseRuleBackup(await file.text()),
      );

      for (const rule of importedRules) {
        await saveRule(rule);

        if (rulesStore.getState().status === 'error') {
          throw new Error(
            rulesStore.getState().errorMessage ??
              'Could not save imported rules.',
          );
        }
      }

      setBackupMessage(
        `Imported ${importedRules.length} ${importedRules.length === 1 ? 'rule' : 'rules'} as disabled copies.`,
      );
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Could not import this backup.',
      );
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
            : actionType === 'modifyResponseHeaders'
              ? {
                  type: 'modifyResponseHeaders' as const,
                  responseHeaders: [
                    ...parseSetResponseHeaders(
                      String(formData.get('setResponseHeaders') ?? ''),
                    ),
                    ...parseRemoveResponseHeaders(
                      String(formData.get('removeResponseHeaders') ?? ''),
                    ),
                  ],
                }
              : actionType === 'injectCss'
                ? {
                    type: 'injectCss' as const,
                    css: String(formData.get('css') ?? ''),
                  }
                : actionType === 'injectJavaScript'
                  ? {
                      type: 'injectJavaScript' as const,
                      script: String(formData.get('script') ?? ''),
                    }
                  : actionType === 'delayRequest'
                    ? {
                        type: 'delayRequest' as const,
                        requestPattern: String(
                          formData.get('requestPattern') ?? '',
                        ).trim(),
                        delayMs: Number(formData.get('delayMs')),
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
    const setResponseHeadersInput = form.elements.namedItem(
      'setResponseHeaders',
    ) as HTMLTextAreaElement;
    const removeResponseHeadersInput = form.elements.namedItem(
      'removeResponseHeaders',
    ) as HTMLTextAreaElement;
    const cssInput = form.elements.namedItem('css') as HTMLTextAreaElement;
    const scriptInput = form.elements.namedItem(
      'script',
    ) as HTMLTextAreaElement;
    const requestPatternInput = form.elements.namedItem(
      'requestPattern',
    ) as HTMLInputElement;
    const delayMsInput = form.elements.namedItem(
      'delayMs',
    ) as HTMLInputElement;

    nameInput.setCustomValidity(errors.name ?? '');
    urlPatternInput.setCustomValidity(errors.urlPattern ?? '');
    targetUrlInput?.setCustomValidity(errors.targetUrl ?? '');
    addOrReplaceParamsInput?.setCustomValidity(errors.queryParams ?? '');
    removeParamsInput?.setCustomValidity(errors.queryParams ?? '');
    setRequestHeadersInput?.setCustomValidity(errors.requestHeaders ?? '');
    removeRequestHeadersInput?.setCustomValidity(errors.requestHeaders ?? '');
    setResponseHeadersInput?.setCustomValidity(errors.responseHeaders ?? '');
    removeResponseHeadersInput?.setCustomValidity(
      errors.responseHeaders ?? '',
    );
    cssInput?.setCustomValidity(errors.css ?? '');
    scriptInput?.setCustomValidity(errors.script ?? '');
    requestPatternInput?.setCustomValidity(errors.requestPattern ?? '');
    delayMsInput?.setCustomValidity(errors.delayMs ?? '');

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

  function clearRuleFilters() {
    setRuleSearch('');
    setRuleCategory('all');
  }

  function toggleRuleFilters() {
    setFiltersOpen((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        rulesScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }

      return nextOpen;
    });
  }

  return (
    <main className="popup">
      <div className="popup-fixed">
        <header className="app-header">
          <div>
            <p className="eyebrow">HTTP request interceptor</p>
            <h1>Echo</h1>
          </div>

          {rules.length > 0 && (
            <button
              className="primary-button compact-button"
              onClick={openRuleDialog}
            >
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

        <div className="backup-actions" aria-label="Rule backup actions">
          <button
            className="secondary-button backup-button"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            Import rules
          </button>
          <button
            className="secondary-button backup-button"
            type="button"
            disabled={rules.length === 0}
            onClick={handleExportRules}
          >
            Export rules
          </button>
          <input
            className="sr-only"
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImportRules(event)}
          />
        </div>

        {rules.length > 0 && (
          <div className="section-heading">
            <h2 id="rules-title">Rules</h2>
            <div className="spotlight-shell">
              <button
                className={`spotlight-search ${filtersOpen ? 'is-open' : ''} ${filtersActive ? 'has-filters' : ''} ${filtersOpen || filtersActive ? 'has-clear' : ''}`}
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="rule-filters"
                onClick={toggleRuleFilters}
              >
                <svg aria-hidden="true" viewBox="0 0 20 20">
                  <circle cx="8.5" cy="8.5" r="5.25" />
                  <path d="m12.5 12.5 4 4" />
                </svg>
                <span>Search rules</span>
                {filtersActive && (
                  <span className="search-active-dot" aria-hidden="true" />
                )}
              </button>
              {(filtersOpen || filtersActive) && (
                <button
                  className="spotlight-clear"
                  type="button"
                  aria-label="Clear search and close filters"
                  onClick={() => {
                    clearRuleFilters();
                    setFiltersOpen(false);
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <span className="rule-count">
              {filtersActive
                ? `${filteredRules.length}/${rules.length}`
                : rules.length}
            </span>
          </div>
        )}
      </div>

      <div className="rules-scroll" ref={rulesScrollRef}>

      {backupMessage && (
        <p className="backup-message" role="status">
          {backupMessage}
        </p>
      )}

      {backupError && (
        <p className="error-banner" role="alert">
          {backupError}
        </p>
      )}

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
          {filtersOpen && (
            <div className="rule-filters" id="rule-filters">
              <label className="filter-search">
                <span className="sr-only">Search rules</span>
                <input
                  type="search"
                  value={ruleSearch}
                  placeholder="Search name, URL, or value…"
                  onChange={(event) => setRuleSearch(event.currentTarget.value)}
                />
              </label>

              <div className="filter-chips" aria-label="Filter by interceptor type">
                <button
                  className={ruleCategory === 'all' ? 'is-selected' : ''}
                  type="button"
                  onClick={() => setRuleCategory('all')}
                >
                  All
                </button>
                {ACTION_OPTIONS.map((option) => (
                  <button
                    className={ruleCategory === option.type ? 'is-selected' : ''}
                    key={option.type}
                    type="button"
                    onClick={() => setRuleCategory(option.type)}
                  >
                    {ACTION_LABELS[option.type]}
                  </button>
                ))}
              </div>

              {filtersActive && (
                <button
                  className="clear-filters"
                  type="button"
                  onClick={clearRuleFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {filteredRules.length > 0 ? (
            <ul className="rule-list">
            {filteredRules.map((rule) => (
              <li className="rule-card" key={rule.id}>
                <div className="rule-copy">
                  <div className="rule-title-row">
                    <h3 title={rule.name}>{rule.name}</h3>
                  </div>
                  <div className="rule-badge-row">
                    <span className={`rule-type rule-type-${rule.action.type}`}>
                      {ACTION_LABELS[rule.action.type]}
                    </span>
                    {rule.action.type === 'delayRequest' && (
                      <span className="experimental-badge">Experimental</span>
                    )}
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
                  {rule.action.type === 'modifyResponseHeaders' && (
                    <p className="redirect-target">
                      {rule.action.responseHeaders.filter(
                        ({ operation }) => operation === 'set',
                      ).length}{' '}
                      set ·{' '}
                      {rule.action.responseHeaders.filter(
                        ({ operation }) => operation === 'remove',
                      ).length}{' '}
                      removed
                    </p>
                  )}
                  {rule.action.type === 'injectCss' && (
                    <p className="redirect-target">
                      {rule.action.css.length} CSS characters
                    </p>
                  )}
                  {rule.action.type === 'injectJavaScript' && (
                    <p className="redirect-target">
                      {rule.action.script.length} JavaScript characters
                    </p>
                  )}
                  {rule.action.type === 'delayRequest' && (
                    <p className="redirect-target">
                      {rule.action.delayMs} ms · {rule.action.requestPattern}
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
                    <button
                      className="rule-action-button edit-button"
                      type="button"
                      aria-label={`Edit ${rule.name}`}
                      title="Edit rule"
                      onClick={() => openEditDialog(rule.id)}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      className="rule-action-button delete-button"
                      type="button"
                      aria-label={`Delete ${rule.name}`}
                      title="Delete rule"
                      onClick={() => void handleDelete(rule)}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
            </ul>
          ) : (
            <div className="no-filter-results">
              <strong>No matching rules</strong>
              <span>Try a different search or category.</span>
              <button type="button" onClick={clearRuleFilters}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      )}
      </div>

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
                    <span className="action-card-top">
                      <span className="action-icon" aria-hidden="true">
                        {option.icon}
                      </span>
                      {option.experimental && (
                        <span className="experimental-badge">Experimental</span>
                      )}
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
                className={`selected-action selected-action-${selectedActionType}`}
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
                {selectedActionType === 'delayRequest' && (
                  <span className="experimental-badge">Experimental</span>
                )}
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
                <span>
                  {selectedActionType === 'injectCss' ||
                  selectedActionType === 'injectJavaScript' ||
                  selectedActionType === 'delayRequest'
                    ? 'Page match pattern'
                    : 'URL pattern'}
                </span>
                <input
                  name="urlPattern"
                  placeholder={
                    selectedActionType === 'injectCss' ||
                    selectedActionType === 'injectJavaScript' ||
                    selectedActionType === 'delayRequest'
                      ? '*://*.example.com/*'
                      : '||analytics.example.com^'
                  }
                  defaultValue={editingRule?.urlPattern}
                  autoComplete="off"
                  required
                  onInput={(event) => event.currentTarget.setCustomValidity('')}
                />
                <small>
                  {selectedActionType === 'injectCss' ||
                  selectedActionType === 'injectJavaScript' ||
                  selectedActionType === 'delayRequest'
                    ? 'Uses browser extension match-pattern syntax.'
                    : 'Uses Chrome URL filter syntax.'}
                </small>
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

              {selectedActionType === 'modifyResponseHeaders' && (
                <div className="action-fields">
                  <label className="field">
                    <span>Set response headers</span>
                    <textarea
                      name="setResponseHeaders"
                      placeholder={'cache-control: no-store\nx-echo: working'}
                      defaultValue={
                        editingRule?.action.type === 'modifyResponseHeaders'
                          ? formatSetResponseHeaders(
                              editingRule.action.responseHeaders,
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
                    <span>Remove response headers</span>
                    <textarea
                      name="removeResponseHeaders"
                      placeholder={'x-powered-by\nserver'}
                      defaultValue={
                        editingRule?.action.type === 'modifyResponseHeaders'
                          ? formatRemoveResponseHeaders(
                              editingRule.action.responseHeaders,
                            )
                          : ''
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>
                      One name per line. Set-Cookie values are never stored.
                    </small>
                  </label>
                </div>
              )}

              {selectedActionType === 'injectCss' && (
                <div className="action-fields">
                  <label className="field">
                    <span>CSS</span>
                    <textarea
                      className="code-editor"
                      name="css"
                      placeholder={'body {\n  outline: 3px solid #3498DB;\n}'}
                      defaultValue={
                        editingRule?.action.type === 'injectCss'
                          ? editingRule.action.css
                          : ''
                      }
                      spellCheck="false"
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>
                      Stored locally and applied only to matching pages.
                    </small>
                  </label>
                </div>
              )}

              {selectedActionType === 'injectJavaScript' && (
                <div className="action-fields">
                  <div className="security-warning" role="note">
                    <strong>User-authored code can read and change matched pages.</strong>
                    <span>
                      Echo runs it locally in an isolated world with extension
                      messaging disabled. Review every script before enabling it.
                    </span>
                  </div>

                  {userScriptsAvailable === false && (
                    <div className="capability-warning" role="alert">
                      Enable <strong>Allow User Scripts</strong> from Echo’s
                      extension details, then reload Echo. On Chromium versions
                      before 138, enable Developer mode instead.
                    </div>
                  )}

                  <label className="field">
                    <span>JavaScript</span>
                    <textarea
                      className="code-editor script-editor"
                      name="script"
                      placeholder={'document.body.dataset.echo = "active";'}
                      defaultValue={
                        editingRule?.action.type === 'injectJavaScript'
                          ? editingRule.action.script
                          : ''
                      }
                      spellCheck="false"
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>
                      Local source only. Maximum size: 50 KB. Remote imports are
                      not provided by Echo.
                    </small>
                  </label>
                </div>
              )}

              {selectedActionType === 'delayRequest' && (
                <div className="action-fields">
                  <div className="experimental-warning" role="note">
                    <strong>Experimental page-level simulation</strong>
                    <span>
                      Delays page fetch and XMLHttpRequest calls only. It does
                      not delay navigation, images, service workers, or general
                      browser traffic.
                    </span>
                  </div>

                  <label className="field">
                    <span>Request URL pattern</span>
                    <input
                      name="requestPattern"
                      placeholder="*://api.example.com/*"
                      defaultValue={
                        editingRule?.action.type === 'delayRequest'
                          ? editingRule.action.requestPattern
                          : ''
                      }
                      autoComplete="off"
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>Uses * as a wildcard against the complete URL.</small>
                  </label>

                  <label className="field">
                    <span>Delay in milliseconds</span>
                    <input
                      name="delayMs"
                      type="number"
                      min="1"
                      max="30000"
                      step="1"
                      placeholder="1000"
                      defaultValue={
                        editingRule?.action.type === 'delayRequest'
                          ? editingRule.action.delayMs
                          : 1000
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity('')
                      }
                    />
                    <small>Maximum delay: 30,000 ms.</small>
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
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    selectedActionType === 'injectJavaScript' &&
                    userScriptsAvailable !== true
                  }
                >
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
