# json-enc

This extension encodes request parameters as JSON instead of URL-encoded form data.

## Install

```html
<script src="/path/to/ext/json-enc.js" defer></script>
```

## Usage

Add the `hx-json-enc` attribute to any element to enable JSON encoding for its requests:

```html
<div hx-post="/test" hx-json-enc>click me</div>
```

Use `hx-json-enc:inherited` on a parent to apply JSON encoding to all descendant requests:

```html
<form hx-json-enc:inherited>
  <button hx-post="/a">A</button>
  <button hx-post="/b">B</button>
</form>
```

Set `hx-json-enc="false"` to disable it on a specific element.

## Notes

- Sets `Content-Type: application/json` on the request
- Values from `hx-vals` are merged in with their original types preserved
