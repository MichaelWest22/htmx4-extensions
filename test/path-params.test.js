describe('path-params extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/path-params/path-params.js';
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

  it('substitutes path param and removes it from query string', async function() {
    mockResponse('GET', '/items/42', 'OK');

    createProcessedHTML(
      '<a id="link" hx-get="/items/{itemId}" hx-vals=\'{"itemId": "42", "foo": "bar"}\'>test</a>'
    );

    find('#link').click();
    await forRequest();

    const url = lastFetch().url;
    url.should.include('/items/42');
    url.should.not.include('itemId');
    url.should.include('foo=bar');
  });

  it('encodes special characters in param values', async function() {
    mockResponse('GET', '/items/a%2Fb', 'OK');

    createProcessedHTML('<a id="link" hx-get="/items/{itemId}" hx-vals=\'{"itemId": "a/b"}\'>test</a>');

    find('#link').click();
    await forRequest();

    lastFetch().url.should.include('/items/a%2Fb');
  });

  it('leaves placeholder intact when param is not present', async function() {
    mockResponse('GET', '/items/{itemId}', 'OK');

    createProcessedHTML('<a id="link" hx-get="/items/{itemId}">test</a>');

    find('#link').click();
    await forRequest();

    lastFetch().url.should.include('/items/%7BitemId%7D');
  });

  it('leaves missing variables intact when some params present', async function() {
    mockResponse('GET', '/items/42/%7BsubItem%7D', 'OK');

    createProcessedHTML('<a id="link" hx-get="/items/{itemId}/{subItem}" hx-vals=\'{"itemId": "42"}\'>test</a>');

    find('#link').click();
    await forRequest();

    const url = lastFetch().url;
    url.should.include('/items/42/');
    url.should.not.include('itemId');
  });

  it('works with POST requests', async function() {
    mockResponse('POST', '/items/99', 'OK');

    createProcessedHTML(
      '<form id="form" hx-post="/items/{itemId}">' +
      '<input name="itemId" value="99">' +
      '<input name="extra" value="data">' +
      '</form>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    const call = lastFetch();
    call.url.should.include('/items/99');
    call.url.should.not.include('itemId');
  });
});
