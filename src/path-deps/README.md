# path-deps

Supports inter-element dependencies based on URL paths. When any element makes a mutating request (non-GET) to a path, all elements that declare a dependency on that path are automatically refreshed.

## Install

```html
<script src="/path/to/ext/path-deps.js" defer></script>
```

## Usage

Add `path-deps` to an element with `hx-trigger="path-deps"` to refresh it when a mutating request hits a matching path:

```html
<ul hx-get="/list" hx-trigger="path-deps" path-deps="/list"></ul>
<button hx-post="/list">Post To List</button>
```

Use `*` to match any path segment:

```html
<div hx-get="/contacts" hx-trigger="path-deps" path-deps="/contacts/*"></div>
```

Set `path-deps="ignore"` to opt out of all path-dep refreshes.

## JavaScript API

`PathDeps.refresh(path)` — manually trigger a refresh for all elements that depend on the given path:

```js
PathDeps.refresh('/path/to/refresh');
```
