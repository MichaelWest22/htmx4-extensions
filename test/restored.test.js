describe('restored extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/restored/restored.js';
    await new Promise(resolve => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  });

  after(() => {
    restoreExtensions(extBackup);
  });

  beforeEach(function() {
    setupTest(this.currentTest);
  });

  afterEach(function() {
    cleanupTest();
  });

  it('triggers restored event on elements with hx-trigger="restored"', function() {
    createProcessedHTML('<div id="target" hx-trigger="restored" hx-get="/refresh"></div>');

    let triggered = false;
    find('#target').addEventListener('restored', () => { triggered = true; });

    htmx.trigger(document, 'htmx:before:restore:history', { path: '/test' });

    triggered.should.equal(true);
  });

  it('triggers restored on data-hx-trigger="restored" elements', function() {
    createProcessedHTML('<div id="target" data-hx-trigger="restored" hx-get="/refresh"></div>');

    let triggered = false;
    find('#target').addEventListener('restored', () => { triggered = true; });

    htmx.trigger(document, 'htmx:before:restore:history', { path: '/test' });

    triggered.should.equal(true);
  });

  it('does not trigger restored on elements without hx-trigger="restored"', function() {
    createProcessedHTML('<div id="target" hx-trigger="click" hx-get="/refresh"></div>');

    let triggered = false;
    find('#target').addEventListener('restored', () => { triggered = true; });

    htmx.trigger(document, 'htmx:before:restore:history', { path: '/test' });

    triggered.should.equal(false);
  });
});
