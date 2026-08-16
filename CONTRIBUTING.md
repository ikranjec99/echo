# Contributing to Echo

Thank you for helping improve Echo. Contributions should keep the extension
local-first, understandable, and safe for developers to run across websites.

## Before you start

- Search existing issues before opening a new one.
- Use a bug report for reproducible defects.
- Use a feature request for new behavior or significant design changes.
- Discuss changes that add permissions, collect data, inject code, or introduce
  a backend before implementing them.
- Do not include credentials, cookies, authorization headers, private URLs, or
  other sensitive data in issues, screenshots, fixtures, or tests.

## Development setup

Requirements:

- Node.js 22 or newer
- npm 11 or newer
- Chrome, Brave, or another Chromium-based browser

Install and verify the project:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Load `.output/chrome-mv3` as an unpacked extension to test browser behavior.

## Branches

- Create every feature and bugfix branch from the latest `master` branch.
- Use a short descriptive branch name such as `feature/query-parameters` or
  `fix/brave-resource-types`.
- Open pull requests against `master` unless a maintainer requests another
  target.
- Keep unrelated changes in separate pull requests.

## Code guidelines

- Use TypeScript and preserve strict type checking.
- Keep browser-specific APIs behind small adapters where practical.
- Use dependency injection for logic that needs unit testing outside a browser.
- Use Zustand when new reactive application state is genuinely required.
- Prefer browser-native controls and accessible semantics.
- Keep HTTP rules deterministic and validate user input before persistence.
- Document new permissions and cross-browser limitations.
- Never download and execute remote code.

## Tests

Add or update tests when changing validation, storage, rule compilation,
synchronization, or state behavior.

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
```

For browser-facing changes, also describe the manual Chrome or Brave checks you
performed.

## User interface changes

- Follow [`docs/brand.md`](./docs/brand.md).
- Use `#3498DB` for primary identity/actions and `#2ECC71` for enabled or
  successful states.
- Preserve keyboard focus, readable contrast, and explicit status text.
- Include screenshots for visible changes when possible.

## Commit and pull-request guidance

- Write concise, imperative commit subjects.
- Explain why a change is needed, not only what files changed.
- Link related issues.
- Call out new permissions, migrations, data-shape changes, and known browser
  differences.
- Keep generated `.output`, `.wxt`, and dependency directories out of commits.

By contributing, you agree that your contributions are licensed under Echo's
[MIT License](./LICENSE).
