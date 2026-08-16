# Rule syntax

Echo currently supports local block and redirect rules using the browser's
Manifest V3 `declarativeNetRequest` URL-filter syntax.

## Rule fields

Every rule contains:

- **Name:** A local label shown in Echo.
- **URL pattern:** A pattern matched against request URLs.
- **Action:** Block or redirect.
- **Redirect URL:** An absolute HTTP or HTTPS URL required for redirect rules.
- **Enabled state:** Whether the rule is installed in the browser request engine.

Disabled rules remain saved but do not affect requests.

## URL-filter tokens

| Token | Meaning |
| --- | --- |
| `*` | Matches any number of characters |
| `|` | Anchors the start or end of a URL when placed at that edge |
| `||` | Anchors the beginning of a domain or subdomain |
| `^` | Matches a URL separator or the end of the URL |

URL filters must contain only ASCII characters. Internationalized domain names
must use their Punycode representation, and non-ASCII URL characters must be URL
encoded.

Echo does not currently support regular-expression rules.

## Recommended patterns

### Domain and subdomains

```text
||example.com^
```

Matches `example.com` and its subdomains across HTTP and HTTPS while preventing
false matches such as `example.company`.

### Exact HTTPS host without subdomains

```text
|https://www.example.com/
```

Matches URLs beginning with that exact scheme and host.

### Path family

```text
||api.example.com/v1/*
```

Matches requests under `/v1/` on that domain and its subdomains.

### File type or suffix

```text
*.tracking.js|
```

Uses a right anchor to require the request URL to end with `.tracking.js`.
Query strings would prevent this particular pattern from matching.

### Simple substring

```text
/telemetry/
```

Matches the text anywhere in the URL. Use substring rules carefully because they
can affect unrelated domains and query values.

## Unsafe or surprising patterns

Avoid an unanchored domain:

```text
example.com
```

It can also match URLs where `example.com` appears in a path or query parameter.

Avoid an incomplete domain anchor:

```text
||example.com
```

It may also match a longer top-level domain such as `example.company`. Prefer:

```text
||example.com^
```

Patterns beginning with `||*` are invalid. Use `*` without the domain anchor.

## Block rules

A block rule prevents matching requests before they are sent. Echo explicitly
applies rules to common page, frame, script, style, image, font, media, Fetch/XHR,
WebSocket, ping, CSP-report, object, and other request categories.

When blocking a page that is already open, reload or navigate again to produce a
new network request. Disabling the rule allows later requests; it does not reload
the page automatically.

## Redirect rules

A redirect rule sends every matching request to one fixed absolute HTTP or HTTPS
destination.

Example:

```text
Pattern:      ||api.example.com/v1/users^
Redirect URL: http://localhost:3000/mock-users.json
```

Avoid redirect loops. The destination should not also match the same rule unless
the intended browser behavior has been tested.

Redirect rules require broad host permission. Echo documents and requests that
permission in its manifest.

## Matching scope

Echo currently applies each enabled rule to all supported request categories.
Per-method, per-resource-type, tab-specific, initiator-specific, and environment
conditions are not yet available in the UI.

If multiple Echo rules match the same request, the browser resolves them using
Manifest V3 action and priority rules. Echo currently assigns the same priority
to every rule, so users should avoid overlapping rules with conflicting actions.

## Browser differences

Chrome, Brave, Edge, and Opera use Chromium's DNR rule model. Echo emits explicit
resource types because Brave did not reliably match dynamic rules when the field
was omitted during development testing.

Firefox provides a related DNR API, but Echo's Firefox build has not yet completed
cross-browser verification.

## Reference

The canonical syntax and browser behavior are defined by the
[Chrome declarativeNetRequest documentation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest).
