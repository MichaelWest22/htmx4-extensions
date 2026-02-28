describe('attribute extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/attribute/attribute.js';
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

  it('copies attributes from response to target', async function() {
    mockResponse('GET', '/update', '<div data-x="2" class="new"></div>');

    const target = createProcessedHTML('<div id="target" data-x="1" class="old" hx-get="/update" hx-swap="attribute"></div>');

    target.click();
    await forRequest();

    target.getAttribute('data-x').should.equal('2');
    target.getAttribute('class').should.equal('new');
  });

  it('removes attributes not present in response', async function() {
    mockResponse('GET', '/update', '<div data-y="1"></div>');

    const target = createProcessedHTML('<div id="target" data-x="old" data-y="old" hx-get="/update" hx-swap="attribute"></div>');

    target.click();
    await forRequest();

    assert.isNull(target.getAttribute('data-x'));
    target.getAttribute('data-y').should.equal('1');
  });

  it('add modifier merges classes and keeps existing attributes', async function() {
    mockResponse('GET', '/update', '<div class="new" data-y="2"></div>');

    const target = createProcessedHTML('<div id="target" class="old" data-x="keep" hx-get="/update" hx-swap="attribute add"></div>');

    target.click();
    await forRequest();

    target.classList.contains('old').should.equal(true);
    target.classList.contains('new').should.equal(true);
    target.getAttribute('data-x').should.equal('keep');
    target.getAttribute('data-y').should.equal('2');
  });

  it('remove modifier only removes attributes absent from response', async function() {
    mockResponse('GET', '/update', '<div data-y="ignored"></div>');

    const target = createProcessedHTML('<div id="target" data-x="gone" data-y="keep" hx-get="/update" hx-swap="attribute remove"></div>');

    target.click();
    await forRequest();

    assert.isNull(target.getAttribute('data-x'));
    target.getAttribute('data-y').should.equal('keep');
  });

  it('does not replace element content', async function() {
    mockResponse('GET', '/update', '<div data-x="2">ignored content</div>');

    const target = createProcessedHTML('<div id="target" data-x="1" hx-get="/update" hx-swap="attribute">original</div>');

    target.click();
    await forRequest();

    target.textContent.should.equal('original');
  });
});
