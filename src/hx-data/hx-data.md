# hx-data

Collect `data-*` attributes from the DOM and send them with requests. Receive updates from the server to sync `data-*` attributes across the page.

## Sending Data

### `hx-data` (ancestor walk)

Add `hx-data` as a boolean attribute to collect all `data-*` attributes from the element and its ancestors.

```html
<div data-org="acme">
    <div data-user="alice">
        <button hx-post="/save" hx-data>Save</button>
    </div>
</div>
```

Sends: `hx-data={"user":"alice","org":"acme"}`

Closer ancestors take precedence over outer ones when the same key appears more than once.

Values are JSON-parsed when possible — numbers, booleans, arrays, and objects are decoded automatically:

```html
<div data-count="5" data-active="true" data-items="[1,2,3]">
    <button hx-post="/save" hx-data>Save</button>
</div>
```

Sends: `hx-data={"count":5,"active":true,"items":[1,2,3]}`

### `hx-data="<selector>"` (selector form)

Pass a CSS selector to collect `data-*` attributes from specific elements. Uses htmx's extended selector syntax, so `closest`, `find`, `next`, `previous` all work.

```html
<div id="cart" data-total="99" data-items="3"></div>
<div id="user" data-name="alice" data-role="admin"></div>

<button hx-post="/checkout" hx-data="#cart, #user">Checkout</button>
```

Sends: `hx-data={"total":99,"items":3,"name":"alice","role":"admin"}`

Each matched element is also walked up its ancestor chain, so ambient context is included. Later selectors override earlier ones on key conflicts.

## Receiving Data

### `HX-Data` response header

The server can update `data-*` attributes on the page by returning an `HX-Data` header containing JSON.

Two key formats:

**`data-*` key** — finds all elements that have that attribute and updates them:

```http
HX-Data: {"data-count": "5"}
```

Updates every `[data-count]` element on the page to `"5"`.

**CSS selector key** — finds matching elements and sets the nested `data-*` attributes on them:

```http
HX-Data: {"#cart": {"data-total": "99.50"}}
```

Updates `data-total` on `#cart` only. Non-`data-*` keys inside the selector object are ignored.

Both forms can be combined in one header:

```http
HX-Data: {"data-status": "complete", "#cart": {"data-total": "99.50"}}
```

Non-string values are JSON-stringified when set as attributes.

### `<hx-data>` element

For streaming responses (SSE, WebSockets) or any response where you can't set headers. The element is removed from the DOM after processing.

**Attribute form** — each `data-*` attribute broadcasts to all matching elements on the page:

```html
<hx-data data-count="5" data-status="complete"></hx-data>
```

**JSON body form** — same format as the `HX-Data` header:

```html
<hx-data>{"data-count": "5", "#cart": {"data-total": "99.50"}}</hx-data>
```

**Combined** — attributes processed first, then JSON body:

```html
<hx-data data-status="complete">{"#cart": {"data-total": "99.50"}}</hx-data>
```

## Configuration

### `htmx.config.data.exclude`

Array of camelCase key names (without `data-` prefix) to omit from collection:

```html
<meta name="htmx-config" content='{"data":{"exclude":["token","secret"]}}'>
```

```html
<div data-user="alice" data-token="abc123">
    <button hx-post="/api" hx-data>Send</button>
</div>
```

Sends: `hx-data={"user":"alice"}` — token excluded.

### `htmx.config.data.paramName`

Name of the request parameter. Defaults to `hx-data`:

```html
<meta name="htmx-config" content='{"data":{"paramName":"_state"}}'>
```
