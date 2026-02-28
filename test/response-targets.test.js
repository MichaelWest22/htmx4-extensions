describe('response-targets extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/response-targets/response-targets.js';
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
    // restore noSwap default in case a test mutated it
    htmx.config.noSwap = [204, 304];
  });

  it('retargets swap on exact status code match', async function() {
    mockResponse('POST', '/submit', '<p>Error</p>', { status: 422 });

    createProcessedHTML(
      '<form id="form" hx-post="/submit" hx-target="#success" hx-target-422="#errors">' +
      '</form>' +
      '<div id="success"></div>' +
      '<div id="errors"></div>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    find('#errors').innerHTML.should.include('Error');
    find('#success').innerHTML.should.equal('');
  });

  it('matches wildcard x pattern for status class', async function() {
    mockResponse('POST', '/submit', '<p>Server Error</p>', { status: 503 });

    createProcessedHTML(
      '<form id="form" hx-post="/submit" hx-target="#success" hx-target-5xx="#fatal">' +
      '</form>' +
      '<div id="success"></div>' +
      '<div id="fatal"></div>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    find('#fatal').innerHTML.should.include('Server Error');
    find('#success').innerHTML.should.equal('');
  });

  it('matches error alias for 4xx', async function() {
    mockResponse('POST', '/submit', '<p>Not Found</p>', { status: 404 });

    createProcessedHTML(
      '<form id="form" hx-post="/submit" hx-target="#success" hx-target-error="#err">' +
      '</form>' +
      '<div id="success"></div>' +
      '<div id="err"></div>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    find('#err').innerHTML.should.include('Not Found');
    find('#success').innerHTML.should.equal('');
  });

  it('uses normal target on 200', async function() {
    mockResponse('POST', '/submit', '<p>OK</p>', { status: 200 });

    createProcessedHTML(
      '<form id="form" hx-post="/submit" hx-target="#success" hx-target-error="#err">' +
      '</form>' +
      '<div id="success"></div>' +
      '<div id="err"></div>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    find('#success').innerHTML.should.include('OK');
    find('#err').innerHTML.should.equal('');
  });

  it('prefers more specific status over wildcard', async function() {
    mockResponse('POST', '/submit', '<p>Unprocessable</p>', { status: 422 });

    createProcessedHTML(
      '<form id="form" hx-post="/submit" hx-target="#success" hx-target-422="#specific" hx-target-4xx="#generic">' +
      '</form>' +
      '<div id="success"></div>' +
      '<div id="specific"></div>' +
      '<div id="generic"></div>'
    );

    find('#form').dispatchEvent(new Event('submit', { bubbles: true }));
    await forRequest();

    find('#specific').innerHTML.should.include('Unprocessable');
    find('#generic').innerHTML.should.equal('');
  });

  it('targets this element', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

    createProcessedHTML(
      '<div id="wrap" hx-target-404="this">' +
      '<button id="btn" hx-get="/test">Go</button>' +
      '</div>'
    );

    find('#btn').click();
    await forRequest();

    find('#wrap').innerHTML.should.include('Error');
  });

  it('targets closest ancestor', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

    createProcessedHTML(
      '<div id="wrap">' +
      '<button id="btn" hx-get="/test" hx-target-404="closest div">Go</button>' +
      '</div>'
    );

    find('#btn').click();
    await forRequest();

    find('#wrap').innerHTML.should.include('Error');
  });

  it('targets find descendant', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

    createProcessedHTML(
      '<div id="wrap" hx-get="/test" hx-target-404="find span">' +
      '<span id="err"></span>' +
      '</div>'
    );

    find('#wrap').click();
    await forRequest();

    find('#err').innerHTML.should.include('Error');
  });

  it('targets next sibling', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

    createProcessedHTML(
      '<div>' +
      '<button id="btn" hx-get="/test" hx-target-404="next div">Go</button>' +
      '<div id="err"></div>' +
      '</div>'
    );

    find('#btn').click();
    await forRequest();

    find('#err').innerHTML.should.include('Error');
  });

  it('targets previous sibling', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

    createProcessedHTML(
      '<div>' +
      '<div id="err"></div>' +
      '<button id="btn" hx-get="/test" hx-target-404="previous div">Go</button>' +
      '</div>'
    );

    find('#btn').click();
    await forRequest();

    find('#err').innerHTML.should.include('Error');
  });

  it('prefers HX-Retarget header by default', async function() {
    mockResponse('GET', '/test', '<p>Error</p>', { status: 404, headers: { 'HX-Retarget': '#d2' } });

    createProcessedHTML(
      '<button id="btn" hx-get="/test" hx-target-404="#d1">Go</button>' +
      '<div id="d1"></div>' +
      '<div id="d2"></div>'
    );

    find('#btn').click();
    await forRequest();

    find('#d1').innerHTML.should.equal('');
    find('#d2').innerHTML.should.include('Error');
  });

  it('ignores HX-Retarget when responseTargetPrefersRetargetHeader is false', async function() {
    htmx.config.responseTargetPrefersRetargetHeader = false;
    try {
      mockResponse('GET', '/test', '<p>Error</p>', { status: 404, headers: { 'HX-Retarget': '#d2' } });

      createProcessedHTML(
        '<button id="btn" hx-get="/test" hx-target-404="#d1">Go</button>' +
        '<div id="d1"></div>' +
        '<div id="d2"></div>'
      );

      find('#btn').click();
      await forRequest();

      find('#d1').innerHTML.should.include('Error');
      find('#d2').innerHTML.should.equal('');
    } finally {
      htmx.config.responseTargetPrefersRetargetHeader = true;
    }
  });

  it('keeps existing target when responseTargetPrefersExisting is true', async function() {
    htmx.config.responseTargetPrefersExisting = true;
    try {
      mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

      createProcessedHTML(
        '<button id="btn" hx-get="/test" hx-target="#btn" hx-target-404="#err">Go</button>' +
        '<div id="err"></div>'
      );

      find('#btn').click();
      await forRequest();

      find('#err').innerHTML.should.equal('');
    } finally {
      htmx.config.responseTargetPrefersExisting = false;
    }
  });

  ['hx-target-404', 'hx-target-40*', 'hx-target-40x', 'hx-target-4*', 'hx-target-4x',
   'hx-target-4**', 'hx-target-4xx', 'hx-target-*', 'hx-target-x', 'hx-target-***', 'hx-target-xxx'
  ].forEach(function(attr) {
    it('supports wildcard format ' + attr, async function() {
      mockResponse('GET', '/test', '<p>Error</p>', { status: 404 });

      createProcessedHTML(
        '<button id="btn" hx-get="/test" ' + attr + '="#err">Go</button>' +
        '<div id="err"></div>'
      );

      find('#btn').click();
      await forRequest();

      find('#err').innerHTML.should.include('Error');
    });
  });
});
