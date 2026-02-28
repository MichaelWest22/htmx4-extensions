# attribute

A swap style that copies attributes from the response element to the target element instead of replacing content.

## Install

```html
<script src="/path/to/ext/attribute.js" defer></script>
```

## Usage

```html
<div id="target" class="old" data-x="1" hx-get="/update" hx-swap="attribute">...</div>
```

The response body should contain an element whose attributes will be applied to `#target`. Content is not changed.

## Modifiers

```html
hx-swap="attribute add"     <!-- only add/update attributes, never remove; merges classes -->
hx-swap="attribute remove"  <!-- only remove attributes absent from response, never add -->
```

- Default (no modifier): syncs attributes — adds/updates from response and removes any not present in response
- `add`: only adds or updates; existing attributes not in response are kept; `class` is merged rather than replaced
- `remove`: only removes attributes from target that are absent in the response element
