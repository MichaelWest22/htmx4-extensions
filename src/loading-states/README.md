# loading-states

Manages loading states during htmx requests — show/hide elements, add/remove CSS classes, disable elements, and set `aria-busy`.

## Install

```html
<script src="/path/to/ext/loading-states.js" defer></script>
```

Add this CSS to hide loading elements by default:

```css
[data-loading] { display: none; }
```

## Attributes

- `data-loading` — show element during request (`inline-block` by default, or specify display value)
- `data-loading-class="a b"` — add classes during request, remove after
- `data-loading-class-remove="a b"` — remove classes during request, add back after
- `data-loading-disable` — disable element during request
- `data-loading-aria-busy` — set `aria-busy="true"` during request
- `data-loading-delay="200"` — delay before applying loading state (ms)
- `data-loading-target="selector"` — apply loading state to a different element
- `data-loading-path="/url"` — only apply for requests matching this path
- `data-loading-states` — scope loading states to this container
