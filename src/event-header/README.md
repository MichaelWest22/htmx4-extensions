# event-header

Adds a `Triggering-Event` header to requests containing a JSON representation of the event that triggered the request.

## Install

```html
<script src="/path/to/ext/event-header.js" defer></script>
```

## Usage

Once loaded, the header is automatically added to all htmx requests that have a triggering event.

The server can inspect the header to get details about the triggering event (type, coordinates, target, etc.):

```
Triggering-Event: {"type":"click","target":"button","clientX":0,"clientY":0,"bubbles":true,...}
```
