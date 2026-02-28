# multi-swap

Swaps multiple elements from a response using `hx-swap="multi:..."` with per-element swap styles.

For most use cases, htmx's built-in [Out of Band Swaps](https://htmx.org/docs#oob_swaps) or [`hx-select-oob`](https://htmx.org/attributes/hx-select-oob/) with `hx-swap="none"` are sufficient — consider those before using this extension.

## Install

```html
<script src="/path/to/ext/multi-swap.js" defer></script>
```

## Usage

```html
<!-- swap #id1 and #id2 by innerHTML (default) -->
<button hx-get="/example" hx-swap="multi:#id1,#id2">Update</button>

<!-- different swap styles per element -->
<a href="/example" hx-swap="multi:#id1,#id2:outerHTML,#id3:beforeend,#id4:delete">Update</a>
```

Syntax: `multi:#selector[:swapStyle],...` — default swap style is `innerHTML`. Only ID selectors (`#id`) are supported.

Supported swap styles: `innerHTML`, `outerHTML`, `beforebegin`, `afterbegin`, `beforeend`, `afterend`, `delete`.

## Notes

- The `hx-swap` value **must not contain spaces**
- When using `delete`, the response must still contain the element (can be an empty `<div id="...">`)
- Works well in combination with `hx-boost` and a preload extension
