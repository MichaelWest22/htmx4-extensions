# morphdom-swap

Uses [morphdom](https://github.com/patrick-steele-idem/morphdom) as the swap mechanism via `hx-swap="morphdom"`.

## Install

```html
<script src="https://unpkg.com/morphdom@2/dist/morphdom-umd.js"></script>
<script src="/path/to/ext/morphdom-swap.js" defer></script>
```

## Usage

```html
<div hx-get="/update" hx-swap="morphdom">...</div>
```

## Notes

- morphdom does not support morphing to multiple elements — if the response contains multiple elements, only the first is used
