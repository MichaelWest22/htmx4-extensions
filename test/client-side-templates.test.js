describe('client-side-templates extension', function() {
  let extBackup;

  before(async () => {
    extBackup = backupExtensions();
    clearExtensions();
    let script = document.createElement('script');
    script.src = '../src/client-side-templates/client-side-templates.js';
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

  it('works with mustache template', async function() {
    mockResponse('GET', '/test', '{"foo":"bar"}');
    let tmpl = document.createElement('script');
    tmpl.id = 'mt1';
    tmpl.type = 'x-tmpl-mustache';
    tmpl.textContent = '*{{foo}}*';
    document.body.appendChild(tmpl);

    const btn = createProcessedHTML('<button hx-get="/test" mustache-template="mt1">Click</button>');
    btn.click();
    await forRequest();

    btn.innerHTML.should.equal('*bar*');
    tmpl.remove();
  })

  it('works with mustache array template', async function() {
    mockResponse('GET', '/test', '{"foo":"bar"}');
    let tmpl = document.createElement('script');
    tmpl.id = 'mt2';
    tmpl.type = 'x-tmpl-mustache';
    tmpl.textContent = '*{{data.foo}}*';
    document.body.appendChild(tmpl);

    const btn = createProcessedHTML('<button hx-get="/test" mustache-array-template="mt2">Click</button>');
    btn.click();
    await forRequest();

    btn.innerHTML.should.equal('*bar*');
    tmpl.remove();
  })

  it('works with handlebars template', async function() {
    mockResponse('GET', '/test', '{"foo":"bar"}');
    let tmpl = document.createElement('script');
    tmpl.id = 'hb1';
    tmpl.type = 'text/x-handlebars-template';
    tmpl.textContent = '*{{foo}}*';
    document.body.appendChild(tmpl);

    const btn = createProcessedHTML('<button hx-get="/test" handlebars-template="hb1">Click</button>');
    btn.click();
    await forRequest();

    btn.innerHTML.should.equal('*bar*');
    tmpl.remove();
  })

  it('works with xslt template', async function() {
    mockResponse('GET', '/test', '<foo>bar</foo>');
    let tmpl = document.createElement('script');
    tmpl.id = 'xs1';
    tmpl.type = 'application/xml';
    tmpl.textContent = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:template match="/">*<xsl:value-of select="foo" />*</xsl:template>
    </xsl:stylesheet>`;
    document.body.appendChild(tmpl);

    const btn = createProcessedHTML('<button hx-get="/test" xslt-template="xs1">Click</button>');
    btn.click();
    await forRequest();

    btn.innerHTML.should.include('*bar*');
    tmpl.remove();
  })
})
