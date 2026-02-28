describe('multi-swap extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/multi-swap/multi-swap.js';
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

  it('swaps single element with default innerHTML', async function() {
    createProcessedHTML('<div><button id="btn" hx-get="/test" hx-swap="multi:#a">Click</button><div id="a">Old A</div></div>');
    mockResponse('GET', '/test', '<div id="a">New A</div>');
    find('#btn').click();
    await forRequest();
    find('#a').innerHTML.should.equal('New A');
  })

  it('swaps multiple elements with various styles', async function() {
    createProcessedHTML(
      '<div>' +
      '<button id="btn" hx-get="/test" hx-swap="multi:#a:outerHTML,#b:beforeend,#c:delete,#d:afterbegin,#e:beforebegin,#f:afterend">Click</button>' +
      '<div id="a">Old A</div>' +
      '<div id="b">Old B</div>' +
      '<div id="c">Old C</div>' +
      '<div id="d">Old D</div>' +
      '<div id="e">Old E</div>' +
      '<div id="f">Old F</div>' +
      '</div>'
    );
    mockResponse('GET', '/test',
      '<div>' +
      '<div id="a">New A</div>' +
      '<div id="b">Appended</div>' +
      '<div id="c">gone</div>' +
      '<div id="d">Prepended</div>' +
      '<div id="e">Before</div>' +
      '<div id="f">After</div>' +
      '</div>'
    );
    find('#btn').click();
    await forRequest();
    find('#a').innerHTML.should.equal('New A');           // outerHTML
    find('#b').innerHTML.should.equal('Old BAppended');   // beforeend
    assert.isUndefined(find('#c'));                       // delete
    find('#d').innerHTML.should.equal('PrependedOld D'); // afterbegin
    find('#e').previousSibling.textContent.should.equal('Before'); // beforebegin
    find('#f').nextSibling.textContent.should.equal('After');      // afterend
  })
})
