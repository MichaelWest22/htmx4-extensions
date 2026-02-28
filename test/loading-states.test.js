describe('loading-states extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/loading-states/loading-states.js?v=' + Date.now();
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

  it('shows element during request', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="loader" data-loading style="display:none"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const loader = find('#loader');
    const clickPromise = forRequest();
    btn.click();
    assert.equal(loader.style.display, 'inline-block');
    await clickPromise;
    assert.equal(loader.style.display, 'none');
  })

  it('adds classes during request', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="el" data-loading-class="loading"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const el = find('#el');
    const clickPromise = forRequest();
    btn.click();
    assert.isTrue(el.classList.contains('loading'));
    await clickPromise;
    assert.isFalse(el.classList.contains('loading'));
  })

  it('removes classes during request', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="el" class="active" data-loading-class-remove="active"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const el = find('#el');
    const clickPromise = forRequest();
    btn.click();
    assert.isFalse(el.classList.contains('active'));
    await clickPromise;
    assert.isTrue(el.classList.contains('active'));
  })

  it('disables element during request', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><button id="el" data-loading-disable></button></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const el = find('#el');
    const clickPromise = forRequest();
    btn.click();
    assert.isTrue(el.disabled);
    await clickPromise;
    assert.isFalse(el.disabled);
  })

  it('sets aria-busy during request', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="el" data-loading-aria-busy></div></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const el = find('#el');
    const clickPromise = forRequest();
    btn.click();
    assert.equal(el.getAttribute('aria-busy'), 'true');
    await clickPromise;
    assert.isNull(el.getAttribute('aria-busy'));
  })

  it('filters by data-loading-path', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="match" data-loading-class="loading" data-loading-path="/test"></div><div id="nomatch" data-loading-class="loading" data-loading-path="/other"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const btn = find('#btn');
    const clickPromise = forRequest();
    const beforeRequest = htmx.forEvent('htmx:before:request');
    btn.click();
    await beforeRequest;
    assert.isTrue(find('#match').classList.contains('loading'));
    assert.isFalse(find('#nomatch').classList.contains('loading'));
    await clickPromise;
  })

  it('shows element with custom display value', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="loader" data-loading="flex" style="display:none"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const clickPromise = forRequest();
    find('#btn').click();
    assert.equal(find('#loader').style.display, 'flex');
    await clickPromise;
    assert.equal(find('#loader').style.display, 'none');
  })

  it('applies loading state to custom target', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test" data-loading-target="#loader" data-loading-class="loading">Click</button><div id="loader"></div></div>');
    mockResponse('GET', '/test', 'OK');

    const clickPromise = forRequest();
    find('#btn').click();
    assert.isTrue(find('#loader').classList.contains('loading'));
    await clickPromise;
    assert.isFalse(find('#loader').classList.contains('loading'));
  })

  it('scopes loading states to data-loading-states container', async function() {
    createProcessedHTML(
      '<div data-loading-states>' +
      '<button id="btn" hx-get="/test">Click</button>' +
      '<div id="inside" data-loading-class="loading"></div>' +
      '</div>' +
      '<div id="outside" data-loading-class="loading"></div>'
    );
    mockResponse('GET', '/test', 'OK');

    const clickPromise = forRequest();
    find('#btn').click();
    assert.isTrue(find('#inside').classList.contains('loading'));
    assert.isFalse(find('#outside').classList.contains('loading'));
    await clickPromise;
  })

  it('applies loading state after delay', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test">Click</button><div id="el" data-loading-class="loading" data-loading-delay="50ms"></div></div>');
    mockResponse('GET', '/test', 'OK', { delay: 200 });

    find('#btn').click();
    assert.isFalse(find('#el').classList.contains('loading'));
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.isTrue(find('#el').classList.contains('loading'));
    await forRequest();
    assert.isFalse(find('#el').classList.contains('loading'));
  })
})
