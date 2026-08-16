# Echo roadmap

This roadmap covers capabilities planned after the current blocking and redirect
foundation. It distinguishes features that fit a Manifest V3 browser extension
from features that require a different technical architecture.

## Browser-extension features

### Request and response headers

Status: request- and response-header set and remove operations are implemented
in the current development build.

Add rules that can add, replace, or remove supported HTTP request and response
headers with `declarativeNetRequest.modifyHeaders`.

Planned work:

- Request-header editor
- Response-header editor
- Add, replace, and remove operations
- Validation for restricted or unsupported headers
- Clear permission and privacy explanations
- Compiler and browser integration tests

Limitations:

- Browsers protect some security-sensitive headers.
- Header support and allowed operations can differ by browser.
- Rules must never collect or display authorization values, cookies, or other
  secrets unless a future feature is deliberately designed and reviewed for it.

### Query parameters

Status: implemented in the current development build.

Add rules that transform request URLs by adding, replacing, or removing query
parameters.

Planned work:

- Add-or-replace parameter operation
- Remove parameter operation
- Multiple operations in one rule
- Safe URL encoding
- Duplicate-parameter behavior
- Preview of the transformed URL

Implementation direction:

- Compile operations to declarative URL redirect transforms.
- Preserve fragments and unrelated query parameters.
- Reject transformations that create invalid URLs.

### Script and style injection

Status: local CSS and isolated JavaScript injection are implemented in the
current Chromium development build.

Allow users to inject local JavaScript or CSS into explicitly matched pages.

Planned work:

- CSS injection rules
- JavaScript injection rules
- Page-match configuration
- Run timing configuration where browser support allows it
- Clear enabled state and per-rule permission status
- Visible warnings for scripts with broad site access

Security requirements:

- Request only the scripting permission needed for this feature.
- Keep injected source local by default.
- Never download and execute remote code.
- Explain that injected code runs with access to the target page context allowed
  by the browser.
- Provide an emergency global disable control before shipping this feature.

## Limited experimental features

### Delay simulation

Status: a limited page-level Fetch and XMLHttpRequest experiment is implemented
in the current development build.

Manifest V3 declarative request rules do not provide a general-purpose delay
action. A browser-only implementation can therefore offer only constrained
simulation, not reliable delay of every HTTP request or response.

Possible experiments:

- Wrap page-originated `fetch` and `XMLHttpRequest` calls through an injected
  script.
- Delay selected application-level requests before they are sent.
- Clearly label unsupported traffic, including browser navigation and requests
  that bypass the injected page APIs.

Do not advertise this as general network throttling. Reliable delay simulation
belongs in the future proxy companion described below.

### Mock JSON response simulation

Status: a limited page-level Fetch and XMLHttpRequest experiment is implemented
in the current development build.

Enabled rules can return user-authored JSON and a configured status code for
matching page API calls without sending the request. This does not intercept
navigation, resources, service workers, or general browser traffic.

## Features requiring a local proxy companion

### Response-body modification

`declarativeNetRequest` cannot read or rewrite arbitrary response bodies. Full
network-level response modification still requires a local HTTP(S) proxy
controlled by the user.

A future proxy architecture would need:

- A local companion process
- Explicit proxy configuration and connection status
- Locally generated certificate handling for HTTPS interception
- Strong warnings and certificate-removal instructions
- Body matching and replacement rules
- Content-encoding and streaming support
- Response-size limits
- Strict local-only defaults and redaction controls

### Reliable request and response delay

The same proxy companion can hold matched requests or responses for a configured
duration and can simulate latency, timeouts, and connection failures consistently
across supported applications.

This feature should not be started until the browser extension is stable and the
proxy has a dedicated threat model, security review, and cross-platform plan.

## Suggested delivery order

1. Query-parameter transformations
2. Request-header rules
3. Response-header rules
4. CSS injection
5. JavaScript injection
6. Limited page-level delay experiment
7. Local proxy research and threat model
8. Proxy-based delay and response-body modification
