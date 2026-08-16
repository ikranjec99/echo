# User-script threat model

Echo allows users to store and run their own JavaScript on explicitly matched
pages. This is an intentionally powerful capability and cannot be made risk-free.

## Assets at risk

- Content displayed by a matched page
- Data entered into a matched page
- Page behavior and user actions
- The user's trust in Echo and the target website
- Locally stored script source and match patterns

## Trust boundaries

User-authored JavaScript is untrusted input. Echo must not treat it as extension
source code, render it as HTML, or grant it access to extension APIs.

Target pages are also untrusted. A page must not be able to read Echo's storage,
register scripts, or message privileged extension components through user-script
channels.

## MVP safeguards

- Use the browser's `userScripts` API, which is designed for user-authored code.
- Run only in the isolated `USER_SCRIPT` world.
- Do not offer `MAIN` world execution.
- Disable user-script messaging.
- Configure `default-src 'none'`, `connect-src 'none'`, and `object-src 'none'`.
- Require explicit browser match patterns.
- Store source locally and never download remote scripts.
- Limit each script to 50 KB.
- Require the browser's explicit Allow User Scripts control.
- Unregister scripts when a rule is disabled or Echo is globally paused.
- Display a warning beside the source editor.
- Keep JavaScript actions outside the DNR and CSS execution engines.

These controls reduce accidental privilege and extension-level exposure. They do
not prevent a script from reading or changing DOM content available inside its
matched page. DOM changes can themselves cause network requests, so the CSP is
not a complete data-loss prevention boundary.

Disabling a rule or pausing Echo prevents future execution but cannot reverse
arbitrary changes a script already made. Reload affected pages after disabling
JavaScript injection.

## Out of scope

- Remote script URLs, package registries, and CDN imports
- Script discovery or automatic installation
- Extension API bridges or privileged messaging
- Main-world execution
- Cross-device script synchronization
- Claims that arbitrary scripts are safe

## User guidance

Users should run only code they understand and trust, choose the narrowest match
pattern possible, and avoid pages containing financial, authentication, health,
or other sensitive data. Echo's global pause is the emergency disable control.

## Browser behavior

Chrome 138 and newer require the per-extension **Allow User Scripts** toggle.
Older supported Chromium versions use Developer mode. Firefox exposes
`userScripts` as an optional permission and requires a separate implementation
and testing pass before Echo supports it.
