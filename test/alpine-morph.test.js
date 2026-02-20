describe('alpine-morph extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/alpine-morph/alpine-morph.js';
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

  it('uses Alpine.morph when swap style is morph', async function() {
    let morphCalled = false;
    let morphTarget, morphContent;

    window.Alpine = {
      morph: function(target, content) {
        morphCalled = true;
        morphTarget = target;
        morphContent = content;
      }
    };

    mockResponse('GET', '/test', '<div id="target">new content</div>');

    const div = createProcessedHTML('<div id="target" hx-get="/test" hx-swap="morph"></div>');

    find('#target').click();
    await forRequest();

    assert.isTrue(morphCalled);
  })

  it('does not handle non-morph swap styles', async function() {
    let morphCalled = false;
    window.Alpine = { morph: function() { morphCalled = true; } };

    mockResponse('GET', '/test', '<div>new content</div>');

    createProcessedHTML('<div id="target" hx-get="/test" hx-swap="innerHTML"></div>');

    find('#target').click();
    await forRequest();

    assert.isFalse(morphCalled);
  })
})
