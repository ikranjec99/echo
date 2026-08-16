<p align="center">
  <img src="./public/icon/icon-128.png" alt="Echo logo" width="96" height="96" />
</p>

<h1 align="center">Echo</h1>

<p align="center">
  A local, open-source browser extension for intercepting HTTP requests.
</p>

Echo lets developers block and redirect matching browser requests with rules
that stay on their device. It is built with React, TypeScript, Zustand, and WXT.

## Status

Echo is an early development preview. The current build supports:

- Creating block and redirect rules
- Adding, replacing, and removing URL query parameters
- Setting and removing supported HTTP request headers
- Setting and removing supported HTTP response headers
- Injecting local CSS into explicitly matched pages
- Running local JavaScript in isolated user-script worlds
- Experimentally delaying page-originated Fetch and XMLHttpRequest calls
- Chrome URL-filter patterns
- Enabling and disabling individual rules
- Pausing and resuming all interception without changing individual rules
- Editing and deleting rules
- Persistent local browser storage
- Live Manifest V3 dynamic-rule synchronization
- Chrome, Brave, and other Chromium-based browsers
- Light and dark themes

See [the roadmap](./docs/roadmap.md) for planned capabilities and their browser
limitations.

Technical details are available in the [architecture guide](./docs/architecture.md)
and [rule-syntax guide](./docs/rule-syntax.md). Current development changes are
tracked in the [changelog](./CHANGELOG.md).

Tested targets, expected API support, and browser-specific debugging behavior
are documented in the [browser compatibility guide](./docs/browser-compatibility.md).

## Privacy

Echo has no backend, user accounts, analytics, or cloud synchronization. Rules
are stored in the browser profile with `browser.storage.local`.

Echo does not inspect or upload request bodies, response bodies, cookies,
authorization headers, or browsing history.

## Permissions

Echo requests:

- `storage` to persist rules locally.
- `declarativeNetRequestWithHostAccess` to apply browser request rules.
- `userScripts` to run JavaScript explicitly created by the user in an isolated
  browser-managed execution world.
- `<all_urls>` because users can create rules for arbitrary websites and
  redirect rules require explicit host access.

Broad host access is fundamental to a general-purpose request interceptor. Echo
uses it only to apply rules created by the user.

JavaScript injection additionally requires the browser's **Allow User Scripts**
control. See the [user-script threat model](./docs/user-script-threat-model.md)
before enabling this feature.

## Install locally

### Requirements

- Node.js 22 or newer
- npm 11 or newer
- Chrome, Brave, or another Chromium-based browser

### Build

```bash
npm install
npm run build
```

### Load the extension

1. Open `chrome://extensions` or `brave://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3` from this repository.
5. Grant the requested site access.

After source changes, run `npm run build` and reload Echo from the browser's
extensions page.

## Create a rule

Open Echo from the browser toolbar, select **Add rule**, and provide:

- A descriptive rule name
- A Chrome URL-filter pattern
- A block, redirect, query-parameter, request-header, or response-header action
- An absolute HTTP or HTTPS destination for redirects

Example block pattern:

```text
||analytics.example.com^
```

An enabled rule has a green switch and is installed into the browser's dynamic
request rules. A disabled rule remains saved but does not affect requests.

The global Echo switch temporarily removes all active browser rules. Resuming
Echo restores the individually enabled rules, and the paused state persists
across browser and computer restarts.

## Development

```bash
# Start WXT development mode
npm run dev

# Run unit tests
npm test

# Run TypeScript validation
npm run typecheck

# Create a production build
npm run build

# Create a distributable archive
npm run zip
```

Generated `.wxt`, `.output`, coverage, and dependency directories are excluded
from Git.

## Project structure

```text
entrypoints/  Browser-extension background and popup entry points
lib/          Validation, storage, compilation, and synchronization logic
store/        Zustand state stores
types/        Shared domain types
tests/        Unit tests
public/       Runtime extension assets
assets/       Design source assets
docs/         Brand guide and roadmap
```

The rule engine, storage adapter, and browser synchronizer use dependency
injection so they can be tested independently of a running extension.

## Contributing

Contributions and bug reports are welcome. Before submitting a change:

1. Keep request processing local by default.
2. Avoid collecting secrets or browsing data.
3. Add tests for rule-engine behavior.
4. Run `npm test`, `npm run typecheck`, and `npm run build`.
5. Document new permissions and browser limitations.

Brand colors and usage guidance are documented in
[the brand guide](./docs/brand.md).

## Security

Report suspected vulnerabilities privately by following
[the security policy](./SECURITY.md). Do not include credentials, private URLs,
or sensitive browsing data in public issues.

## License

Echo is available under the [MIT License](./LICENSE).
