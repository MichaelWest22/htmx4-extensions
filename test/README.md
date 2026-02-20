# Testing htmx 4 Extensions

Simple HTML-based testing using Mocha and Chai.

## Running Tests

Open `test/test.html` in a browser.

## Writing Tests

Tests are located in `test/<extension-name>/<extension-name>.test.js`.

Example:

```javascript
describe('my-extension', function() {
  let extBackup;

  beforeEach(function() {
    setupTest(this.currentTest);
    extBackup = backupExtensions();
    clearExtensions();
    // Register extension inline
    htmx.registerExtension('my-ext', {
      htmx_before_request: function(elt, detail) {
        // extension logic
      }
    });
  })

  afterEach(function() {
    restoreExtensions(extBackup);
    cleanupTest();
  })

  it('does something', async function() {
    mockResponse('POST', '/test', 'response');
    const div = createProcessedHTML('<div hx-post="/test">click</div>');
    div.click();
    await forRequest();
    div.innerHTML.should.equal('response');
  })
})
```

Add your test script to `test/test.html`.
