describe('morphdom-swap extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();

    await new Promise(resolve => {
      let s = document.createElement('script');
      s.src = './lib/morphdom-umd.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });

    let script = document.createElement('script');
    script.src = '../src/morphdom-swap/morphdom-swap.js';
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

  it('morphs content using morphdom', async function() {
    mockResponse('GET', '/test', '<div id="target" hx-get="/test" hx-swap="morphdom">updated</div>');
    const div = createProcessedHTML('<div id="target" hx-get="/test" hx-swap="morphdom">original</div>');
    div.click();
    await forRequest();
    find('#target').innerHTML.should.equal('updated');
  })

  it('processes htmx attributes in morphed content', async function() {
    mockResponse('GET', '/test', '<div id="target" hx-get="/test" hx-swap="morphdom">updated<span id="inner" hx-get="/inner" hx-trigger="load"></span></div>');
    mockResponse('GET', '/inner', 'loaded');
    const div = createProcessedHTML('<div id="target" hx-get="/test" hx-swap="morphdom">original</div>');
    div.click();
    await forRequest();
    await forRequest();
    find('#target').textContent.should.include('loaded');
  })
})
