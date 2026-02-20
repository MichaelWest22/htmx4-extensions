# client-side-templates

Transforms JSON/XML responses into HTML via client-side templates before swapping into the DOM. Supports mustache, handlebars, nunjucks, and XSLT.

## Install

```html
<script src="https://unpkg.com/mustache@latest"></script>
<script src="/path/to/ext/client-side-templates.js" defer></script>
```

## Usage

Add a `<template-engine>-template` attribute to the element (or an ancestor) with the ID of the template:

```html
<button hx-get="/some_json" mustache-template="my-template">Go</button>
<button hx-get="/some_json" handlebars-template="my-template">Go</button>
<button hx-get="/some_json" nunjucks-template="my-template">Go</button>
<button hx-get="/some_xml"  xslt-template="my-template">Go</button>
```

Use `*-array-template` variants for APIs returning arrays — data is accessed as `data`:

```html
<button hx-get="/some_json" mustache-array-template="my-template">Go</button>

<template id="my-template">
  {{#data}}<p>{{name}}</p>{{/data}}
</template>
```
