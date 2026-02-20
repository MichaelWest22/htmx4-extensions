describe('json-enc extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/json-enc/json-enc.js';
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

  it('handles post with form parameters', async function() {
    mockResponse('POST', '/test', 'OK');

    const form = createProcessedHTML(
      '<form hx-post="/test" hx-json-enc> ' +
      '<input type="text" name="username" value="joe"> ' +
      '<input type="password" name="password" value="123456"> ' +
      '<button id="btnSubmit">Submit</button></form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    lastCall.request.headers['Content-Type'].should.equal('application/json');
    const body = JSON.parse(lastCall.request.body);
    body.username.should.equal('joe');
    body.password.should.equal('123456');
  })

  it('handles multiple values per key', async function() {
    mockResponse('POST', '/test', 'OK');

    const form = createProcessedHTML(
      '<form hx-post="/test" hx-json-enc> ' +
      '<input type="text" name="foo" value="A">' +
      '<input type="text" name="foo" value="B">' +
      '<input type="text" name="foo" value="C">' +
      '<input type="text" name="bar" value="D">' +
      '<button id="btnSubmit">Submit</button>' +
      '</form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    const body = JSON.parse(lastCall.request.body);
    body.should.have.keys('foo', 'bar');
    body.foo.should.be.instanceOf(Array);
    body.foo.length.should.equal(3);
    body.foo[0].should.equal('A');
    body.foo[1].should.equal('B');
    body.foo[2].should.equal('C');
    body.bar.should.equal('D');
  })

  it('handles multiple select', async function() {
    mockResponse('POST', '/test', 'OK');

    const form = createProcessedHTML(
      '<form hx-post="/test" hx-json-enc> ' +
      '<select multiple="multiple" name="foo">' +
      '<option value="A" selected="selected">A</option>' +
      '<option value="B">B</option>' +
      '<option value="C" selected="selected">C</option>' +
      '</select>' +
      '<input type="text" name="bar" value="D">' +
      '<button id="btnSubmit">Submit</button>' +
      '</form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    const body = JSON.parse(lastCall.request.body);
    body.should.have.keys('foo', 'bar');
    body.foo.should.be.instanceOf(Array);
    body.foo.length.should.equal(2);
    body.foo[0].should.equal('A');
    body.foo[1].should.equal('C');
    body.bar.should.equal('D');
  })

  it('does not encode without hx-json-enc attribute', async function() {
    mockResponse('POST', '/test', 'OK');

    const form = createProcessedHTML(
      '<form hx-post="/test"> ' +
      '<input type="text" name="username" value="joe"> ' +
      '<button id="btnSubmit">Submit</button></form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    assert.notEqual(lastCall.request.headers['Content-Type'], 'application/json');
    assert.notInstanceOf(lastCall.request.body, String);
  })

  it('preserves types from hx-vals', async function() {
    mockResponse('POST', '/test', 'OK');

    const form = createProcessedHTML(
      '<form hx-post="/test" hx-json-enc hx-vals=\'{"count": 42, "active": true}\'> ' +
      '<input type="text" name="username" value="joe"> ' +
      '<button id="btnSubmit">Submit</button></form>'
    );

    find('#btnSubmit').click();
    await forRequest();

    const lastCall = lastFetch();
    const body = JSON.parse(lastCall.request.body);
    assert.equal(body.count, 42);
    assert.equal(body.active, true);
    assert.equal(body.username, 'joe');
  })
})
