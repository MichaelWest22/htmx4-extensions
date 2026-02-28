# alpine-morph

Uses [Alpine.js morph plugin](https://alpinejs.dev/plugins/morph) as the swap mechanism, preserving Alpine state when htmx swaps entire Alpine components.

## Install

```html
<script defer src="https://unpkg.com/@alpinejs/morph@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script src="/path/to/ext/alpine-morph.js" defer></script>
```

## Usage

```html
<div hx-target="this" hx-swap="morph">
  <div x-data="{ count: 0 }">
    <div x-text="count"></div>
    <button x-on:click="count++" hx-get="/swap">Morph</button>
  </div>
</div>
```

All Alpine `x-data` state (count, replaced, message, etc.) is preserved even when the entire Alpine component is swapped.

## Notes

- Requires `@alpinejs/morph` plugin loaded before this extension
- The server response must return the full element being replaced (the element with `hx-target="this"`)
- Alpine state (`x-data`) is preserved across swaps
