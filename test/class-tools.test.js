describe('class-tools extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/class-tools/class-tools.js';
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

  it('adds classes properly', function(done) {
    var div = createProcessedHTML('<div classes="add c1"></div>');
    assert.isFalse(div.classList.contains('c1'));
    setTimeout(function() {
      assert.isTrue(div.classList.contains('c1'));
      done();
    }, 150);
  })

  it('removes classes properly', function(done) {
    var div = createProcessedHTML('<div class="foo bar" classes="remove bar"></div>');
    assert.isTrue(div.classList.contains('bar'));
    setTimeout(function() {
      assert.isTrue(div.classList.contains('foo'));
      assert.isFalse(div.classList.contains('bar'));
      done();
    }, 150);
  })

  it('adds classes with data-* prefix', function(done) {
    var div = createProcessedHTML('<div data-classes="add c1"></div>');
    assert.isFalse(div.classList.contains('c1'));
    setTimeout(function() {
      assert.isTrue(div.classList.contains('c1'));
      done();
    }, 150);
  })

  it('applies classes to parent with apply-parent-classes', function(done) {
    var div = createProcessedHTML('<div><div apply-parent-classes="add c1"></div></div>');
    assert.isFalse(div.classList.contains('c1'));
    setTimeout(function() {
      assert.isTrue(div.classList.contains('c1'));
      done();
    }, 150);
  })

  it('removes child after apply-parent-classes', function(done) {
    var div = createProcessedHTML('<div><div id="ct-child" apply-parent-classes="add c1"></div></div>');
    setTimeout(function() {
      assert.isNull(document.getElementById('ct-child'));
      done();
    }, 50);
  })

  it('processes children with classes attribute', function(done) {
    var div = createProcessedHTML('<div><div id="ct-inner" classes="add c1"></div></div>');
    setTimeout(function() {
      assert.isTrue(document.getElementById('ct-inner').classList.contains('c1'));
      done();
    }, 150);
  })
})
