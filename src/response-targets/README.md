# response-targets

Allows targeting different elements for swap based on the HTTP response status code, using `hx-target-[CODE]` attributes.

## Install

```html
<script src="/path/to/ext/response-targets.js" defer></script>
```

## Usage

```html
<div hx-ext="response-targets">
  <button hx-post="/register"
          hx-target="#response-div"
          hx-target-404="#not-found"
          hx-target-5*="#serious-errors">
    Register!
  </button>
  <div id="response-div"></div>
  <div id="not-found"></div>
  <div id="serious-errors"></div>
</div>
```

Use `hx-target-error` to handle all 4xx and 5xx codes with one attribute:

```html
<button hx-post="/register" hx-target="#success" hx-target-error="#errors">
```

## Target value syntax

The attribute value can be:
- A CSS selector — `#my-div`
- `this` — the element that declares the attribute
- `closest <CSS>` — nearest ancestor matching selector
- `find <CSS>` — first descendant matching selector
- `next <CSS>` — next sibling matching selector
- `previous <CSS>` — previous sibling matching selector

## Wildcard resolution

Attributes are matched from most to least specific. For a 404 response:

`hx-target-404` → `hx-target-40*` → `hx-target-4*` → `hx-target-*`

Use `x` instead of `*` for templating engines that don't support asterisks in attributes (e.g. `hx-target-4xx`).

## Notes

- `hx-target-…` is inherited and can be placed on a parent element
- Cannot be used to handle HTTP 200
- Honors `HX-Retarget` response header by default (configurable)

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `responseTargetPrefersRetargetHeader` | `true` | Prefer `HX-Retarget` header over `hx-target-…` |
| `responseTargetPrefersExisting` | `false` | Keep existing target if already set |
| `responseTargetUnsetsError` | `true` | Clear error flag when retargeting on error codes |
| `responseTargetSetsError` | `false` | Set error flag when retargeting on non-error codes |
