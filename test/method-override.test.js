describe('method-override extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/method-override/method-override.js';
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

  it('overrides DELETE as POST with header', async function() {
    mockResponse('POST', '/test', 'Deleted!');
    const btn = createProcessedHTML('<button hx-delete="/test">Click</button>');
    btn.click();
    await forRequest();
    const call = lastFetch();
    call.request.method.should.equal('POST');
    call.request.headers['X-HTTP-Method-Override'].should.equal('DELETE');
    btn.innerHTML.should.equal('Deleted!');
  })

  it('overrides PATCH as POST with header', async function() {
    mockResponse('POST', '/test', 'Patched!');
    const btn = createProcessedHTML('<button hx-patch="/test">Click</button>');
    btn.click();
    await forRequest();
    const call = lastFetch();
    call.request.method.should.equal('POST');
    call.request.headers['X-HTTP-Method-Override'].should.equal('PATCH');
  })

  it('overrides PUT as POST with header', async function() {
    mockResponse('POST', '/test', 'Putted!');
    const btn = createProcessedHTML('<button hx-put="/test">Click</button>');
    btn.click();
    await forRequest();
    const call = lastFetch();
    call.request.method.should.equal('POST');
    call.request.headers['X-HTTP-Method-Override'].should.equal('PUT');
  })

  it('does not override GET', async function() {
    mockResponse('GET', '/test', 'Getted!');
    const btn = createProcessedHTML('<button hx-get="/test">Click</button>');
    btn.click();
    await forRequest();
    const call = lastFetch();
    call.request.method.should.equal('GET');
    assert.isUndefined(call.request.headers['X-HTTP-Method-Override']);
  })

  it('does not override POST', async function() {
    mockResponse('POST', '/test', 'Posted!');
    const btn = createProcessedHTML('<button hx-post="/test">Click</button>');
    btn.click();
    await forRequest();
    const call = lastFetch();
    call.request.method.should.equal('POST');
    assert.isUndefined(call.request.headers['X-HTTP-Method-Override']);
  })
})
