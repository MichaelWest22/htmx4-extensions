# method-override

Converts non-GET/POST requests to POST with an `X-HTTP-Method-Override` header set to the original method. This is necessary when dealing with firewalls or proxies that block PUT/PATCH/DELETE requests.

## Install

```html
<script src="/path/to/ext/method-override.js" defer></script>
```

## Usage

Once loaded, any `hx-put`, `hx-patch`, or `hx-delete` request will be sent as POST with the original method in the `X-HTTP-Method-Override` header:

```html
<button hx-put="/update">
  This request will be sent as POST with X-HTTP-Method-Override: PUT
</button>
```
