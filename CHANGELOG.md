# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project intends to follow [Semantic Versioning](https://semver.org/)
when formal releases begin.

## [Unreleased]

### Added

- React and TypeScript browser-extension foundation powered by WXT
- Local block and fixed-destination redirect rules
- Query-parameter add, replace, and remove rules
- Request-header set and remove rules with sensitive-value safeguards
- Response-header set and remove rules with Set-Cookie safeguards
- Local CSS injection rules with page match patterns and global pause support
- Isolated local JavaScript injection using the browser userScripts API
- Capability detection, source limits, warnings, and user-script threat model
- Experimental page-level Fetch and XMLHttpRequest delay rules
- Explicit Experimental labeling and aligned timing icon for delay rules
- Fixed status header with independently scrollable rule content
- Action-focused rule editor with branded interceptor type cards
- Chrome URL-filter pattern validation
- Persistent rules with `browser.storage.local`
- Zustand-backed loading, saving, toggling, editing, and deletion
- Manifest V3 dynamic-rule compilation and background synchronization
- Explicit enabled and disabled status labels
- Persistent global pause and resume control
- Confirmed rule deletion
- Branded light and dark popup themes
- Echo icon assets for extension and toolbar sizes
- Chrome, Brave, and Chromium Manifest V3 build configuration
- Unit tests for validation, storage, compilation, synchronization, and state
- Verification-only GitHub Actions workflow
- MIT license and open-source contributor templates
- Brand, roadmap, architecture, rule-syntax, security, and contribution docs
- Browser support matrix and Brave response-header debugging guidance

### Fixed

- Prevented long action labels from widening and clipping the scrollable rule
  list.
- Prevented the popup from collapsing to its initial viewport height instead of
  giving the rule list the available browser popup space.
- Added explicit request resource types so Brave applies dynamic block and
  redirect rules reliably.
- Prevented browser API access as an import-time side effect, allowing storage
  and state modules to run in unit tests.
- Added the WXT preparation step and React JSX compiler configuration required
  for clean TypeScript builds.

### Security

- Restricted redirect targets to absolute HTTP and HTTPS URLs.
- Kept request processing and rule storage local with no backend or telemetry.
- Documented broad host access and responsible vulnerability disclosure.

[Unreleased]: https://github.com/ikranjec99/echo/commits/master
