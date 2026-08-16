# Browser compatibility

Echo currently ships a Chromium Manifest V3 build. Browser API support and
Echo's tested release targets are separate concerns: a browser may implement the
required API even when Echo has not yet completed release testing there.

## Current status

| Browser | API expectation | Echo status |
| --- | --- | --- |
| Brave | Chromium `declarativeNetRequest` | Manually tested |
| Chrome | Native `declarativeNetRequest` support | Expected to work; release testing pending |
| Edge | Chromium `declarativeNetRequest` support | Expected to work; release testing pending |
| Opera and other Chromium browsers | Chromium API, with possible vendor differences | Not yet tested |
| Firefox | Supports declarative request and response header modification | Firefox build and release testing pending |
| Safari | Different extension packaging and compatibility requirements | Not supported |

Do not interpret API availability as a release guarantee. Each browser target
must pass Echo's automated suite and manual interception tests before it is
listed as officially supported.

## Response-header visibility in Brave DevTools

Brave can apply a response-header rule without showing the modified header in
DevTools' **Network → Headers** list. During manual testing, the Network panel
showed the server's original response headers while the page received Echo's
modified header.

This is a DevTools visibility difference, not evidence that the rule failed.
Verify the page-visible result from the page console:

```js
fetch('/response-headers')
  .then((response) => response.headers.get('x-echo-response'))
  .then(console.log);
```

For a rule that sets `x-echo-response: working`, the expected result is:

```text
working
```

You can separately confirm rule installation from Echo's background service
worker console:

```js
chrome.declarativeNetRequest.getDynamicRules().then(console.log);
```

## Cross-browser considerations

- Chrome documents request and response `modifyHeaders` actions from Chrome 86.
- Firefox documents request and response header modifications through its
  WebExtensions `declarativeNetRequest` API.
- Edge supports Manifest V3 `declarativeNetRequest` through its Chromium
  extension platform.
- Browsers can differ in rule ordering, restricted requests, protected headers,
  debugging APIs, and DevTools presentation.
- Header modification requires matching host permissions. Echo currently asks
  for broad host access because users can create rules for arbitrary sites.

The most reliable compatibility check is the behavior visible to the target
page or server, not DevTools presentation alone.

## References

- [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Firefox declarativeNetRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest)
- [Firefox ModifyHeaderInfo](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/ModifyHeaderInfo)
- [Microsoft Edge extension API support](https://learn.microsoft.com/en-au/microsoft-edge/extensions/developer-guide/api-support)
