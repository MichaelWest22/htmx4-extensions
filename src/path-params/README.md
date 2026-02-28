# path-params

Uses request parameters to populate `{param}` placeholders in the URL path. Matched parameters are removed so they are not sent in the query string or body.

## Install

```html
<script src="/path/to/ext/path-params.js" defer></script>
```

## Usage

This invokes `/items/42?foo=bar`:

```html
<a hx-get="/items/{itemId}" hx-vals='{"itemId": "42", "foo": "bar"}'>test</a>
```
