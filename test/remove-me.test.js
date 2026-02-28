describe('remove-me extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/remove-me/remove-me.js';
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

  it('removes element after specified interval', async function() {
    createProcessedHTML('<div id="target" remove-me="50ms">Gone</div>');

    find('#target').should.exist;
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.isUndefined(find('#target'));
  });

  it('supports data-remove-me attribute', async function() {
    createProcessedHTML('<div id="target" data-remove-me="50ms">Gone</div>');

    find('#target').should.exist;
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.isUndefined(find('#target'));
  });

  it('removes children with remove-me when parent is processed', async function() {
    createProcessedHTML(
      '<div id="parent">' +
      '<span id="child" remove-me="50ms">Gone</span>' +
      '</div>'
    );

    find('#child').should.exist;
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.isUndefined(find('#child'));
    find('#parent').should.exist;
  });

  it('does not remove element before interval elapses', async function() {
    createProcessedHTML('<div id="target" remove-me="500ms">Still here</div>');

    await new Promise(resolve => setTimeout(resolve, 50));
    find('#target').should.exist;
  });
});
