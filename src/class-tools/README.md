# class-tools

Allows you to specify CSS classes to be added, removed, or toggled on elements using a `classes` or `data-classes` attribute, enabling CSS transitions without JavaScript.

## Install

```html
<script src="/path/to/ext/class-tools.js" defer></script>
```

## Usage

A `classes` value consists of runs separated by `&`. Within a run, operations are separated by `,` and applied sequentially. Each operation is `add`, `remove`, or `toggle` followed by a class name and optional `:delay`.

```html
<div classes="add foo"></div>                        <!-- adds "foo" after 100ms -->
<div class="bar" classes="remove bar:1s"></div>      <!-- removes "bar" after 1s -->
<div class="bar" classes="remove bar:1s, add foo:1s"></div>  <!-- removes then adds -->
<div class="bar" classes="remove bar:1s & add foo:1s"></div> <!-- both after 1s -->
<div classes="toggle foo:1s"></div>                  <!-- toggles "foo" every 1s -->
```

## Out-of-band class manipulation

Use `apply-parent-classes` (or `data-apply-parent-classes`) to apply classes to the element's parent, then remove itself. Useful with `hx-swap-oob`:

```html
<div hx-swap-oob="beforeend: #my-element">
  <div apply-parent-classes="add foo, remove foo:10s"></div>
</div>
```
