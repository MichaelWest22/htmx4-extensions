describe('debug extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/debug/debug.js';
    await new Promise(resolve => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  })

  after(() => {
    restoreExtensions(extBackup);
  })

  beforeEach(function() {
    setupTest(this.currentTest);
  })

  afterEach(function() {
    cleanupTest();
  })

  it('logs htmx events to console', async function() {
    const logged = [];
    const orig = console.debug;
    console.debug = (...args) => logged.push(args);

    mockResponse('GET', '/test', 'Clicked!');
    const btn = createProcessedHTML('<button hx-get="/test">Click Me!</button>');
    btn.click();
    await forRequest();

    console.debug = orig;
    assert.isTrue(logged.length > 0);
  })
})
