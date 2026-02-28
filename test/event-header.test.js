describe('event-header extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/event-header/event-header.js';
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

  it('sends the Triggering-Event header', async function() {
    mockResponse('GET', '/test', 'OK');

    const btn = createProcessedHTML('<button hx-get="/test">Click Me!</button>');
    btn.click();
    await forRequest();

    const lastCall = lastFetch();
    const header = lastCall.request.headers['Triggering-Event'];
    assert.ok(header);
    const json = JSON.parse(header);
    json.type.should.equal('click');
  })
})
