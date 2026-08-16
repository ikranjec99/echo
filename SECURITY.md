# Security policy

Echo applies user-defined rules to browser network requests and requests broad
site access for that purpose. Security reports are taken seriously even while
the project is in early development.

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.x` development builds | Yes |
| Older or modified builds | No |

Until Echo has formal releases, test reports against the latest `master` branch
or identify the exact commit used.

## Report a vulnerability privately

Do not disclose a suspected vulnerability in a public issue, pull request,
discussion, screenshot, or test fixture.

Use GitHub's private vulnerability reporting for this repository:

<https://github.com/ikranjec99/echo/security/advisories/new>

If private reporting is unavailable, open a public issue titled **Security
contact requested** without technical details, reproduction steps, private URLs,
or sensitive data. A maintainer can then establish a private reporting channel.

## Include in a report

Provide only the information needed to reproduce and assess the issue:

- A concise description and potential impact
- The Echo version or commit
- Browser name and full version
- Operating system
- Minimal reproduction steps
- Sanitized logs or proof-of-concept code
- Whether the issue is already public or actively exploited
- Suggested remediation, if known

Never include real credentials, cookies, authorization headers, session tokens,
private browsing history, personal data, or private service URLs. Use synthetic
test values and domains wherever possible.

## Relevant security issues

Examples of reports that belong here include:

- Echo sending local rule or browsing data to an external service
- Request rules affecting sites outside their configured scope
- Permission bypasses or unexpected privilege expansion
- Unauthorized script or style injection
- Exposure of stored rules to untrusted page contexts
- Unsafe handling of redirect targets or rule input
- A dependency vulnerability that is reachable through Echo
- A way to execute remote code through an Echo rule or update path

## Usually out of scope

The following are normally outside Echo's security scope unless Echo introduces
or materially worsens the behavior:

- Vulnerabilities in the browser itself
- Differences in documented Chrome, Brave, Edge, or Firefox behavior
- Social engineering that does not exploit Echo
- Denial of service requiring local modification of the extension source
- Reports based only on automated scanner output without a reachable impact
- Problems in unofficial or modified Echo builds

## Disclosure process

Maintainers will make a best effort to:

1. Confirm receipt through the private reporting channel.
2. Reproduce and assess the issue.
3. Coordinate a fix and regression tests.
4. Document permission or migration changes when relevant.
5. Credit the reporter if requested and appropriate.

No guaranteed response or remediation timeline is offered while the project is
maintained by volunteers. Please allow reasonable time for investigation before
public disclosure.

## Security principles

- Keep rules and processing local by default.
- Do not collect request bodies, response bodies, credentials, or browsing
  history.
- Request only permissions required by documented features.
- Never download and execute remote code.
- Validate rules before persistence and browser synchronization.
- Keep browser-facing logic small and independently testable.
