# client-side-templates

Transforms JSON/XML responses into HTML via client-side templates before swapping into the DOM. Supports mustache, handlebars, nunjucks, and XSLT.

## Install

```html
<script src="https://unpkg.com/mustache@latest"></script>
<script src="/path/to/ext/client-side-templates.js" defer></script>
```

## Usage

Add a `<template-engine>-template` attribute to the triggering element (or an ancestor) with the ID of the template:

```html
<button hx-get="/some_json" mustache-template="my-template">Go</button>
<button hx-get="/some_json" handlebars-template="my-template">Go</button>
<button hx-get="/some_json" nunjucks-template="my-template">Go</button>
<button hx-get="/some_xml"  xslt-template="my-template">Go</button>
```

Each engine resolves templates differently:
- `mustache` / `handlebars` / `xslt` — look up a `<script>` or `<template>` tag by ID
- `nunjucks` — resolves by name via `nunjucks.render()`; if not found in the DOM, fetches it from the server as a file path

## Array templates

Use `*-array-template` variants for APIs returning arrays — the array is wrapped as `{ data: [...] }`:

```html
<button hx-get="/users" mustache-array-template="my-template">Go</button>

<template id="my-template">
  {{#data}}<p>{{name}}</p>{{/data}}
</template>
```

## Notes

- Many APIs use CORS protection that will block browser requests — you may need to proxy through your server
- To allow cross-domain requests, set `selfRequestsOnly: false` in htmx config: `<meta name="htmx-config" content='{"selfRequestsOnly":false}'>`
