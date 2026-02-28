describe('path-deps extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/path-deps/path-deps.js';
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

  it('triggers path-deps event on elements that depend on the mutated path', async function() {
    mockResponse('POST', '/list', '<li>new</li>');
    mockResponse('GET', '/list', '<li>refreshed</li>');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/list"></ul>' +
      '<button id="btn" hx-post="/list">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('does not trigger path-deps on GET requests', async function() {
    mockResponse('GET', '/list', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/list"></ul>' +
      '<div id="trigger" hx-get="/list"></div>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#trigger').click();
    await forRequest();

    triggered.should.equal(false);
  });

  it('matches wildcard path segments', async function() {
    mockResponse('POST', '/contacts/1', 'OK');
    mockResponse('GET', '/contacts', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/contacts" hx-trigger="path-deps" path-deps="/contacts/*"></ul>' +
      '<button id="btn" hx-post="/contacts/1">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('does not trigger on non-matching paths', async function() {
    mockResponse('POST', '/other', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/list"></ul>' +
      '<button id="btn" hx-post="/other">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();

    triggered.should.equal(false);
  });

  it('ignores elements with path-deps="ignore"', async function() {
    mockResponse('POST', '/list', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="ignore"></ul>' +
      '<button id="btn" hx-post="/list">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();

    triggered.should.equal(false);
  });

  it('PathDeps.refresh() manually triggers matching elements', function() {
    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/list"></ul>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    PathDeps.refresh('/list');

    triggered.should.equal(true);
  });

  it('triggers when dep path has trailing slash', async function() {
    mockResponse('POST', '/test', 'OK');
    mockResponse('GET', '/list', '<li>refreshed</li>');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/test/"></ul>' +
      '<button id="btn" hx-post="/test">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('triggers when request path is longer than dep path', async function() {
    mockResponse('POST', '/test/child', 'OK');
    mockResponse('GET', '/list', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/test"></ul>' +
      '<button id="btn" hx-post="/test/child">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('does not trigger when dep path is longer than request path', async function() {
    mockResponse('POST', '/test', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/test/child"></ul>' +
      '<button id="btn" hx-post="/test">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();

    triggered.should.equal(false);
  });

  it('matches wildcard at start of path', async function() {
    mockResponse('POST', '/test/child/end', 'OK');
    mockResponse('GET', '/list', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/*/child/end"></ul>' +
      '<button id="btn" hx-post="/test/child/end">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('matches wildcard in middle of path', async function() {
    mockResponse('POST', '/test/child/end', 'OK');
    mockResponse('GET', '/list', 'OK');

    createProcessedHTML(
      '<ul id="list" hx-get="/list" hx-trigger="path-deps" path-deps="/test/*/end"></ul>' +
      '<button id="btn" hx-post="/test/child/end">Post</button>'
    );

    let triggered = false;
    find('#list').addEventListener('path-deps', () => { triggered = true; });

    find('#btn').click();
    await forRequest();
    await forRequest();

    triggered.should.equal(true);
  });

  it('PathDeps.refresh() triggers elements with parent path dependency', function() {
    createProcessedHTML(
      '<ul id="child" hx-get="/r1" hx-trigger="path-deps" path-deps="/test/child"></ul>' +
      '<ul id="parent" hx-get="/r2" hx-trigger="path-deps" path-deps="/test"></ul>'
    );

    let childTriggered = false, parentTriggered = false;
    find('#child').addEventListener('path-deps', () => { childTriggered = true; });
    find('#parent').addEventListener('path-deps', () => { parentTriggered = true; });

    PathDeps.refresh('/test/child');

    childTriggered.should.equal(true);
    parentTriggered.should.equal(true);
  });
});
