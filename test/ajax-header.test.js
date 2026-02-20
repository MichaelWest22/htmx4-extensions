describe('ajax-header extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/ajax-header/ajax-header.js';
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

  it('adds X-Requested-With header to requests', async function() {
    mockResponse('GET', '/test', 'OK');

    createProcessedHTML('<div hx-get="/test" id="trigger"></div>');

    find('#trigger').click();
    await forRequest();

    const lastCall = lastFetch();
    lastCall.request.headers['X-Requested-With'].should.equal('XMLHttpRequest');
  })

  it('adds X-Requested-With header to POST requests', async function() {
    mockResponse('POST', '/test', 'OK');

    createProcessedHTML(
      '<form hx-post="/test">' +
      '<button id="btnSubmit">Submit</button></form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    lastCall.request.headers['X-Requested-With'].should.equal('XMLHttpRequest');
  })
})
