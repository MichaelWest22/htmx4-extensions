# hx-streaming

An htmx extension that enables BigPipe-style streaming for both full page loads and htmx-triggered requests. The server streams a normal HTML response and pushes slow content down the wire as it becomes ready — no second requests, no client-side data fetching, no hydration step.

---

## Why

A typical web page that needs data from slow backend sources has two options:

1. **Wait for everything** — hold the response until all data is ready, then send the full page. The user stares at a blank screen.
2. **Send a shell, fetch the rest** — send a skeleton page, then make N additional network requests from the client to fill in the slow parts. Fast initial render, but complex, chatty, and requires a client-side data layer.

hx-streaming gives you a third option: **send everything in one response**. The shell arrives immediately, the browser renders it, and the slow parts stream down behind it as they complete — in any order. The server does the work, the client just renders what arrives.

```
0ms    → shell + placeholders arrive, page renders
800ms  → first slow query done, partial streams down, placeholder swapped
1200ms → second query done, partial streams down
2500ms → third query done, partial streams down
       → connection closes
```

No JavaScript data fetching. No loading spinners driven by client state. No hydration. Just HTML arriving over time.

---

## How it works

The extension operates in two modes depending on how the response arrives.

### Page load streaming (MutationObserver)

On a full page load, the server keeps the HTTP connection open after sending the initial HTML. As slow backend tasks complete, it flushes `<hx-partial>` elements down the wire. The browser parser inserts them into the DOM as they arrive. A MutationObserver watches for them, waits until each node is complete, then passes it to `htmx.swap()` to update the placeholder.

The server emits `<hx-ready>` after the initial shell to signal that the page structure is in place. The extension uses this to fire a synthetic `DOMContentLoaded`, triggering htmx's own init sequence early — the page becomes fully interactive within milliseconds of the first chunk arriving, while the connection is still open streaming slow content.

### htmx fetch streaming (fetch intercept)

When an htmx request (`hx-get`, `hx-post`, etc.) receives a streaming response, the extension intercepts the fetch and processes it in three phases:

1. **Pre-body phase** — any `<hx-partial>` elements that arrive before the `<body>` tag are swapped into the *current page* immediately, before the main swap happens. Use this to update a loading indicator, disable a button, or modify any part of the existing page while the new content is still being generated.
2. **Shell phase** — everything up to and including `</body>` is returned to htmx as the main swap content. htmx performs its normal swap against the target element.
3. **Post-body phase** — after `</body>`, the extension keeps the stream alive and processes any further `<hx-partial>` elements, swapping them into the *new page* as each one completes.

This means a detail page triggered by a card click can stream its skeleton immediately and push slow data in behind it — exactly the same pattern as a full page load, just scoped to a DOM subtree.

---

## Partial format

A partial is an instruction to swap content into a specific element. Two formats are supported and treated identically:

### Wire format (recommended for server use)

```html
<hx-partial hx-target="#my-element" hx-swap="innerHTML">
    <p>The new content</p>
</hx-partial>
```

### Template format (use when content contains scripts or styles)

```html
<template hx type="partial" hx-target="#my-element" hx-swap="innerHTML">
    <p>Content with <script>...</script> tags</p>
</template>
```

The `<hx-partial>` wire format is simpler to emit from a server template. Use `<template hx>` when the partial content contains `<script>` or `<style>` tags — the browser executes inline scripts immediately when `<hx-partial>` is parsed, before the extension can process it. Template content is inert until cloned.

`hx-swap` defaults to `innerHTML` if omitted. Any htmx swap mode is supported: `outerHTML`, `beforeend`, `afterbegin`, etc.

### Trailing space flush (page load only)

When streaming a full page load, always emit a space (or any character) immediately after each closing tag and flush the response buffer:

```
<hx-partial hx-target="#revenue" hx-swap="innerHTML">$48,200</hx-partial> <-- space here
```

On page load the browser's streaming HTML parser is doing the work. It only advances past a node — giving it a `nextSibling` — when it sees content after it. That trailing character is what triggers the `nextSibling` check and causes the extension to process the partial immediately, without waiting for the debounce timeout. Without it, every partial relies on the debounce fallback and processing is delayed by `debounceMs` (default 500ms).

This does not apply to htmx fetch responses — the fetch path reads the response body directly via the Streams API and processes partials from the buffer as they arrive, independent of the browser parser.

---

## Response structure

### Full page load

```
HTTP/1.1 200 OK
Content-Type: text/html
Transfer-Encoding: chunked

<!doctype html>
<html>
<head>...</head>
<body>
  <main id="main">
    <div id="revenue" class="loading">Loading...</div>
    <div id="users"   class="loading">Loading...</div>
  </main>
  <hx-ready></hx-ready>        ← htmx inits here, page is interactive
</body>

<hx-partial hx-target="#revenue" hx-swap="innerHTML">$48,200</hx-partial>   ← arrives 1s later
<hx-partial hx-target="#users"   hx-swap="innerHTML">1,342</hx-partial>     ← arrives 2.5s later
```

The `<hx-ready>` sentinel must appear after the initial shell content. The extension detects it and fires htmx's init sequence immediately, without waiting for the TCP connection to close. Place it after your navigation, placeholders, and any content the user needs to interact with.

Partials can appear anywhere after `<hx-ready>` — before or after `</body>`. They are processed as they arrive, in whatever order the server sends them.

### htmx fetch response (partial request)

When responding to an htmx swap, return the skeleton wrapped in `<body>` tags. htmx strips the `<body>` wrapper and swaps the inner content. The extension uses `</body>` as the split point — everything before it is the main swap, everything after is streamed partials.

Any `<hx-partial>` elements sent *before* `<body>` are applied to the current page before the main swap occurs. This lets the server update the existing page — show a loading state, disable the triggering button, update a status indicator — while the new content is still being generated.

```
HX-Stream-Partials: true

<hx-partial hx-target="#submit-btn" hx-swap="outerHTML">
  <button id="submit-btn" disabled>Loading...</button>
</hx-partial>                                              ← applied to current page immediately

<body>
  <main id="main">
    <div id="rev-chart" class="loading">Loading...</div>
    <div id="rev-top"   class="loading">Loading...</div>
  </main>
</body>                                                    ← main swap happens here

<hx-partial hx-target="#rev-chart" hx-swap="innerHTML">...</hx-partial>   ← arrives 1.2s later
<hx-partial hx-target="#rev-top"   hx-swap="innerHTML">...</hx-partial>   ← arrives 2s later
```

No `<hx-ready>` is needed in fetch responses — htmx is already initialised on the page.

> **Note on the `<body>` wrapper:** Normally htmx partial responses are plain HTML fragments with no `<body>` tag. hx-streaming uses the presence of `<body>` as a timing signal — it marks the boundary between the pre-body phase (partials applied to the current page) and the main swap. If you omit `<body>`, the extension treats the entire response as a no-body stream: all `<hx-partial>` elements are processed first, then whatever non-partial content remains is handed to htmx as the main swap text. This means your slow partials will fire before the skeleton lands in the target, which is rarely what you want. Wrap your skeleton in `<body>` whenever you need the main content to appear before post-body partials begin filling it in.

### Detecting partial vs full page requests

Routes that serve both direct navigation and htmx swaps should check the `hx-request-type` header:

```python
def is_partial(request):
    return request.headers.get('hx-request-type') == 'partial'
```

Return a full `<!doctype html>` page with `<hx-ready>` for direct navigation, and a `<body>...</body>` fragment for htmx swaps. The same route handles both.

---

## Installation

Add the extension script after htmx:

```html
<script src="/htmx.js"></script>
<script src="/hx-streaming.js"></script>
```

Once loaded, the extension automatically registers itself and applies to all htmx requests globally.

---

## Configuration

Configuration is set via the standard htmx meta tag:

```html
<meta name="htmx-config" content="hxStreaming.moEnabled:false hxStreaming.fetchMode:always">
```

| Key | Default | Description |
|---|---|---|
| `hxStreaming.moEnabled` | `true` | Enable the MutationObserver for full page load streaming. Set to `false` if your server never streams full page responses and you only use the fetch path. |
| `hxStreaming.fetchMode` | `"header"` | Controls when the fetch intercept activates streaming processing. `"header"` — only process responses that include the `HX-Stream-Partials` response header. `"always"` — process every htmx response as a potential stream. |
| `hxStreaming.debounceMs` | `500` | Milliseconds the MutationObserver waits after the last DOM mutation before treating a streaming node as complete. Increase if your server flushes chunks slowly; decrease for faster local networks. |

### fetchMode: "header" (default)

The server must send `HX-Stream-Partials: true` on any response that contains streaming partials. Responses without this header pass through to htmx unchanged.

```python
# FastHTML / Starlette example
return StreamingResponse(generate(), headers={"HX-Stream-Partials": "true"})
```

This applies to all response types — htmx fetch requests, boosted links, and history restores all go through the fetch intercept. Full page responses served to boosted navigation must also include the header if they stream partials.

This is the recommended mode — it avoids the overhead of stream processing on ordinary responses and makes the server's intent explicit.

### fetchMode: "always"

Every htmx response is processed as a potential stream. No server-side header is required. Use this if you control all routes and every response may contain partials.

```html
<meta name="htmx-config" content="hxStreaming.fetchMode:always">
```

---

## Constraints

- `<hx-partial>` cannot contain `<script>` or `<style>` tags — use `<template hx type="partial">` instead
- The extension processes one response stream at a time per request — it is not an SSE or WebSocket replacement
- Reconnection and retry are out of scope — this is a one-shot streaming extension for request/response cycles
