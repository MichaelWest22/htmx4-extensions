# htmx 4 Extensions

> **Note**: This is my personal repository for htmx 4 extensions. The offical htmx 4 extensions are included in the main htmx repository.

[htmx](https://four.htmx.org) 4 provides an extension mechanism for defining and using extensions within htmx-based applications.

## Using Extensions

To use an extension, simply include its script file:

```html
<script src="/path/to/ext/debug.js" defer></script>
```

Once loaded, the extension automatically registers itself and applies to all htmx requests globally.

## Defining an Extension

To define an extension you call the `htmx.registerExtension()` function:

```html
<script>
    (function(){
        htmx.registerExtension('my-ext', {
            htmx_before_request: function(elt, detail) {
                console.log("Before request", detail);
            },
            htmx_after_swap: function(elt, detail) {
                console.log("After swap", detail);
            }
        })
    })()
</script>
```

Typically, this is done in a stand-alone javascript file, rather than in an inline `script` tag.

Extensions should have names that are dash separated and that are reasonably short and descriptive.

## Extension Security

To restrict which extensions can load, use the `extensions` config option:

```html
<head>
  <meta name="htmx-config" content='{"extensions": "my-ext,another-ext"}'>
</head>
```

When set, only whitelisted extensions will be allowed to register. Without this config, all extensions are approved by default.

## Event Hooks

Extensions use event-based hooks instead of callbacks. Hook names use underscores instead of colons:

### Core Lifecycle Hooks
```javascript
{
  init: function(internalAPI) {},  // Store API reference
  htmx_before_init: function(elt, detail) {},
  htmx_after_init: function(elt, detail) {},
  htmx_before_process: function(elt, detail) {},
  htmx_after_process: function(elt, detail) {},
  htmx_before_cleanup: function(elt, detail) {},
  htmx_after_cleanup: function(elt, detail) {}
}
```

### Request Lifecycle Hooks
```javascript
{
  htmx_config_request: function(elt, detail) {},
  htmx_before_request: function(elt, detail) {},
  htmx_after_request: function(elt, detail) {},
  htmx_finally_request: function(elt, detail) {},
  htmx_error: function(elt, detail) {}
}
```

### Swap Hooks
```javascript
{
  htmx_before_swap: function(elt, detail) {},
  htmx_after_swap: function(elt, detail) {},
  htmx_before_settle: function(elt, detail) {},
  htmx_after_settle: function(elt, detail) {},
  handle_swap: function(swapStyle, target, fragment, swapSpec) {}  // Return array of new nodes if handled, falsy to skip
}
```

The `handle_swap` hook is called for any swap style not built into htmx. Return an array of the inserted/updated elements if your extension handled the swap, or a falsy value to fall through to the next handler (or an error if none handle it).

### History Hooks
```javascript
{
  htmx_before_history_update: function(elt, detail) {},
  htmx_after_history_update: function(elt, detail) {},
  htmx_before_restore_history: function(elt, detail) {}
}
```

### SSE Hooks (SSE is now built-in)
```javascript
{
  htmx_before_sse_reconnect: function(elt, detail) {},
  htmx_before_sse_stream: function(elt, detail) {},
  htmx_after_sse_stream: function(elt, detail) {},
  htmx_before_sse_message: function(elt, detail) {},
  htmx_after_sse_message: function(elt, detail) {}
}
```

### View Transition Hooks
```javascript
{
  htmx_before_viewTransition: function(elt, detail) {},
  htmx_after_viewTransition: function(elt, detail) {}
}
```

## Request Context

The `detail.ctx` object contains the full request context:

```javascript
{
  sourceElement,      // Element triggering request
  sourceEvent,        // Event that triggered request
  status,            // "created" | "issuing" | "streaming" | "swapped" | "error"
  target,            // Target element for swap
  swap,              // Swap strategy
  request: {
    action,          // Request URL
    method,          // HTTP method
    headers,         // Request headers
    body,            // Request body (FormData)
    validate,        // Whether to validate
    abort,           // Function to abort request
    signal           // AbortSignal
  },
  response: {        // Available after request
    raw,             // Raw Response object
    status,          // HTTP status code
    headers          // Response headers
  },
  text,              // Response text (after request)
  hx                 // HX-* response headers (parsed)
}
```

## Internal API

The `init` hook receives an internal API object:

```javascript
let api;

htmx.registerExtension('my-ext', {
  init: function(internalAPI) {
    api = internalAPI;  // Store for use in other hooks
  },
  
  htmx_after_init: function(elt) {
    let value = api.attributeValue(elt, 'hx-my-attr');
    let specs = api.parseTriggerSpecs('click, keyup delay:500ms');
  }
});
```

Available methods:
- `attributeValue(elt, name, defaultVal, returnElt)` - Get htmx attribute with inheritance
- `parseTriggerSpecs(spec)` - Parse trigger specification string
- `determineMethodAndAction(elt, evt)` - Get HTTP method and URL
- `createRequestContext(elt, evt)` - Create request context object
- `collectFormData(elt, form, submitter)` - Collect form data
- `handleHxVals(elt, body)` - Process hx-vals attribute


## Migration from htmx 2.x

htmx 4 uses a completely different extension API:

### Key Changes

1. **Method renamed**: `htmx.defineExtension()` → `htmx.registerExtension()`
2. **Event-based hooks**: Instead of `onEvent(name, evt)`, use specific hooks like `htmx_before_request`
3. **Hook names use underscores**: `htmx:before:request` → `htmx_before_request`
4. **Extensions must be approved**: Via `config.extensions` in meta tag
5. **Full request context**: Access via `detail.ctx` object
6. **Internal API**: Provided via `init` hook

### Quick Migration Map

| htmx 2.x | htmx 4 | Notes |
|----------|--------|-------|
| `defineExtension()` | `registerExtension()` | Method renamed |
| `onEvent(name, evt)` | Specific hooks | Use `htmx_before_request`, etc. |
| `transformResponse()` | `htmx_after_request` | Modify `detail.ctx.text` |
| `handleSwap()` | `handle_swap` | `(swapStyle, target, fragment, swapSpec)` — return array of nodes or falsy |
| `encodeParameters()` | `htmx_config_request` | Modify `detail.ctx.request.body` |
| `getSelectors()` | `htmx_after_init` | Check attributes with `api.attributeValue()` |
| `isInlineSwap()` | Not needed | Handle in `handle_swap` |

### Example Migration

**htmx 2.x:**
```javascript
htmx.defineExtension('old', {
  onEvent: function(name, evt) {
    if (name === 'htmx:beforeRequest') {
      console.log('Before request');
    }
  },
  transformResponse: function(text, xhr, elt) {
    return text.toUpperCase();
  }
});
```

**htmx 4:**
```javascript
htmx.registerExtension('new', {
  htmx_before_request: function(elt, detail) {
    console.log('Before request');
  },
  htmx_after_request: function(elt, detail) {
    if (detail.ctx.text) {
      detail.ctx.text = detail.ctx.text.toUpperCase();
    }
  }
});
```

For detailed migration guidance, see the [Extension Migration Guide](https://four.htmx.org/extensions/migration-guide).
