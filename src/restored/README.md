# restored

Triggers a `restored` event on elements whenever a history navigation (back/forward button) is detected while using `hx-boost`, allowing them to refresh their content.

## Install

```html
<script src="/path/to/ext/restored.js" defer></script>
```

## Usage

```html
<body hx-boost="true">
  <h1 hx-trigger="restored" hx-get="/header">Come back!</h1>
  <a href="/other_page">I'll be back</a>
</body>
```

The `h1` will fire a `GET /header` request each time the back button is pressed.
